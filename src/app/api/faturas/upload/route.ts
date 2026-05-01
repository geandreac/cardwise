import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { parseFaturaComGroq } from "@/lib/groq-parse";
import { categorizarTransacoes } from "@/lib/groq-categorize";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    const cardId = formData.get("card_id") as string | null;

    if (!file || !cardId) {
      return NextResponse.json(
        { error: "PDF e card_id são obrigatórios." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Arquivo deve ser um PDF." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const { extractText } = await import("unpdf");
    const { text: pages } = await extractText(new Uint8Array(arrayBuffer), {
      mergePages: true,
    });
    const text = Array.isArray(pages) ? pages.join("\n") : String(pages);

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { data: cardData, error: cardError } = await supabase
      .from("cards")
      .select("due_next_month")
      .eq("id", cardId)
      .single();

    if (cardError || !cardData) {
      return NextResponse.json({ error: "Cartão não encontrado." }, { status: 404 });
    }

    const parsed = await parseFaturaComGroq(text);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Falha ao processar a fatura com o Groq. Verifique a qualidade do arquivo ou as credenciais da API.",
        },
        { status: 422 }
      );
    }

    if (parsed.transactions.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma transação encontrada na fatura." },
        { status: 422 }
      );
    }

    // Calcula o reference_month (mês de competência/orçamento) com base na regra de negócio
    const dueYear = parseInt(parsed.due_date.substring(0, 4), 10);
    const dueMonth = parseInt(parsed.due_date.substring(5, 7), 10);
    
    let refYear = dueYear;
    let refMonth = dueMonth;
    
    if (cardData.due_next_month) {
        // Se a fatura vence no mês seguinte, o orçamento é do mês anterior
        refMonth = dueMonth - 1;
        if (refMonth === 0) {
            refMonth = 12;
            refYear -= 1;
        }
    }
    
    parsed.reference_month = `${refYear}-${String(refMonth).padStart(2, "0")}-01`;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil do usuário não encontrado." },
        { status: 404 }
      );
    }

    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("card_id", cardId)
      .eq("reference_month", parsed.reference_month)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma fatura importada para esse cartão nesse mês." },
        { status: 409 }
      );
    }

    const { data: categorias, error: categoriasError } = await supabase
      .from("categories")
      .select("id, name, emoji")
      .eq("profile_id", profile.id);

    if (categoriasError) {
      return NextResponse.json(
        { error: "Erro ao buscar categorias: " + categoriasError.message },
        { status: 500 }
      );
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        card_id: cardId,
        reference_month: parsed.reference_month,
        due_date: parsed.due_date,
        closing_date: parsed.closing_date,
        total_amount: parsed.total_amount,
        status: "open",
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Erro ao criar fatura: " + invoiceError?.message },
        { status: 500 }
      );
    }

    const merchantNames = parsed.transactions.map((tx) => tx.description);
    const categoriaMap = await categorizarTransacoes(
      merchantNames,
      categorias ?? []
    );

    const transactionsToInsert = parsed.transactions.map((tx) => ({
      invoice_id: invoice.id,
      card_id: cardId,
      merchant_name: tx.description,
      amount: tx.amount,
      transaction_date: tx.date,
      competence_date: parsed.reference_month,
      installment_info: tx.installment_info,
      is_recurring: false,
      notes: "",
      category_id: categoriaMap.get(tx.description) ?? null,
    }));

    const { error: txError } = await supabase
      .from("transactions")
      .insert(transactionsToInsert);

    if (txError) {
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { error: "Erro ao inserir transações: " + txError.message },
        { status: 500 }
      );
    }

    const categorizedCount = transactionsToInsert.filter(
      (tx) => tx.category_id !== null
    ).length;

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
      bank: parsed.bank,
      total_amount: parsed.total_amount,
      transactions_count: parsed.transactions.length,
      categorized_count: categorizedCount,
      due_date: parsed.due_date,
      reference_month: parsed.reference_month,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}