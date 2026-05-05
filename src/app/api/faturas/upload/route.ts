import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { parseFaturaComGroq } from "@/lib/groq-parse";
import { categorizarTransacoes } from "@/lib/groq-categorize";
import { findInvoiceByDate, generateInstallmentSeries, calculateFingerprint, calculateCompetenceDate } from "@/lib/invoice-utils";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
    }

    const { data: cardData, error: cardError } = await supabase
      .from("cards")
      .select("due_next_month, closing_day, due_day, nickname")
      .eq("id", cardId)
      .single();

    if (cardError || !cardData) {
      return NextResponse.json({ error: "Cartão não encontrado." }, { status: 404 });
    }

    let parsed;
    try {
      parsed = await parseFaturaComGroq(text);
    } catch (parseErr: any) {
      return NextResponse.json(
        {
          error: `Falha ao processar a fatura com o Groq: ${parseErr.message}`,
        },
        { status: 422 }
      );
    }

    if (!parsed) {
      return NextResponse.json(
        {
          error: "Falha inesperada ao processar a fatura com o Groq.",
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

    // --- SMART CYCLE ADAPTATION (RN03) ---
    // Calcula o reference_month (mês de competência) usando a Regra do Gatilho sobre a data de fechamento do PDF
    if (!parsed.closing_date) {
        return NextResponse.json({ error: "Data de fechamento não encontrada no PDF." }, { status: 422 });
    }
    
    parsed.reference_month = calculateCompetenceDate(cardData, parsed.closing_date);

    // --- VALIDAÇÃO E FILTRAGEM DE CHECKSUM (RN05) ---
    // Filtra negativos e zeros primeiro
    parsed.transactions = parsed.transactions.filter((tx: any) => tx.amount > 0);

    let sumDebits = parsed.transactions.reduce((acc: number, tx: any) => acc + tx.amount, 0);
    const checksumDiff = sumDebits - parsed.total_amount;
    let checksumWarning: string | null = null;

    if (checksumDiff > 0.02) {
      // SOBRE-EXTRAÇÃO: a IA capturou pagamentos ou duplicatas como débitos.
      // Estratégia: remover transações que claramente pertencem à seção de pagamentos
      // (valores que sozinhos empurram a soma acima do total).
      // Filtramos de forma gulosa: removemos os maiores itens que estejam causando o excesso.
      const sorted = [...parsed.transactions].sort((a: any, b: any) => b.amount - a.amount);
      const kept: any[] = [];
      let runningSum = 0;
      for (const tx of sorted) {
        if (runningSum + tx.amount <= parsed.total_amount + 0.02) {
          kept.push(tx);
          runningSum += tx.amount;
        }
      }
      // Só aplicar a filtragem se preservarmos a maioria das transações
      if (kept.length >= parsed.transactions.length * 0.5) {
        checksumWarning = `Sobre-extração detectada (R$ ${sumDebits.toFixed(2)} > R$ ${parsed.total_amount.toFixed(2)}). ${parsed.transactions.length - kept.length} transação(ões) removidas automaticamente.`;
        parsed.transactions = kept;
        sumDebits = runningSum;
      } else {
        // Fallback: aceitar tudo e registrar aviso, sem bloquear
        checksumWarning = `Divergência de checksum (R$ ${sumDebits.toFixed(2)} vs R$ ${parsed.total_amount.toFixed(2)}). Verifique os dados após a importação.`;
      }
    } else if (checksumDiff < -0.02) {
      // SUB-EXTRAÇÃO: parcelas podem ter sido truncadas. Registrar aviso mas não bloquear.
      checksumWarning = `Extração possivelmente incompleta: soma R$ ${sumDebits.toFixed(2)} < total R$ ${parsed.total_amount.toFixed(2)}. Verifique se todas as transações foram capturadas.`;
    }

    let cycleAdjusted = false;
    let pdfClosingDay = cardData.closing_day;
    
    if (parsed.closing_date && parsed.due_date) {
      const closingDate = new Date(parsed.closing_date + "T12:00:00Z");
      const dueDate = new Date(parsed.due_date + "T12:00:00Z");
      const diffTime = Math.abs(dueDate.getTime() - closingDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      pdfClosingDay = closingDate.getUTCDate();
      const pdfDueDay = dueDate.getUTCDate();

      if (pdfClosingDay !== cardData.closing_day || pdfDueDay !== cardData.due_day) {
        await supabase.from("cards").update({
          closing_day: pdfClosingDay,
          due_day: pdfDueDay,
          days_between_closing_and_due: diffDays
        }).eq("id", cardId);
        cycleAdjusted = true;
      }
    }



    // --- UPSERT DA FATURA ---
    // Em vez de bloquear, buscamos se já existe. Se sim, atualizamos o total.
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("card_id", cardId)
      .eq("reference_month", parsed.reference_month)
      .maybeSingle();

    let invoiceId: string;

    if (existingInvoice) {
      invoiceId = existingInvoice.id;
      await supabase
        .from("invoices")
        .update({
          due_date: parsed.due_date,
          closing_date: parsed.closing_date,
          total_amount: parsed.total_amount,
        })
        .eq("id", invoiceId);
    } else {
      const { data: newInvoice, error: invoiceError } = await supabase
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

      if (invoiceError || !newInvoice) {
        return NextResponse.json({ error: "Erro ao criar fatura: " + invoiceError?.message }, { status: 500 });
      }
      invoiceId = newInvoice.id;
    }

    const { data: categorias } = await supabase
      .from("categories")
      .select("id, name, emoji")
      .eq("profile_id", profile.id);

    const merchantNames = parsed.transactions.map((tx) => tx.description);
    const categoriaMap = await categorizarTransacoes(
      merchantNames,
      categorias ?? []
    );

    // --- EXPANSÃO DE PARCELAS E TIMELINE GLOBAL ---
    const finalTransactions: any[] = [];
    
    for (const tx of parsed.transactions) {
      const baseTx = {
        card_id: cardId,
        merchant_name: tx.description,
        amount: tx.amount,
        transaction_date: tx.date,
        installment_info: tx.installment_info,
        original_description: tx.description,
        category_id: categoriaMap.get(tx.description) ?? null,
      };

      // Pular transações com valor zero ou negativo (evita violação de constraint)
      if (baseTx.amount <= 0) continue;

      if (tx.installment_info) {
        const [curr, total] = tx.installment_info.split("/").map(Number);
        if (curr && total) {
          const series = generateInstallmentSeries(baseTx, curr, total, cardData, parsed.reference_month);
          finalTransactions.push(...series);
          continue;
        }
      }
      
      finalTransactions.push({ ...baseTx, is_projection: false });
    }

    // --- DEDUPLICAÇÃO E VÍNCULO DE COMPETÊNCIA (FINGERPRINTING) ---
    // Buscar todas as transações para o cartão (incluindo deletadas) para checar fingerprints
    const { data: dbTransactions } = await supabase
      .from("transactions")
      .select("id, fingerprint, is_projection, is_deleted, invoice_id, amount")
      .eq("card_id", cardId);

    const fingerprintMap = new Map();
    dbTransactions?.forEach(t => {
      if (t.fingerprint) fingerprintMap.set(t.fingerprint, t);
    });
    // --- PRÉ-CRIAÇÃO DE FATURAS FUTURAS (findOrCreate em lote) ---
    // Coletar todos os meses de competência únicos gerados pelas parcelas
    const allCompetenceMonths = new Set<string>();
    for (const tx of finalTransactions) {
      const cm = calculateCompetenceDate(cardData, tx.transaction_date);
      allCompetenceMonths.add(cm);
    }

    // Buscar faturas já existentes para esses meses
    const { data: existingInvoices } = await supabase
      .from("invoices")
      .select("id, reference_month")
      .eq("card_id", cardId)
      .in("reference_month", Array.from(allCompetenceMonths));

    // Mapa: reference_month -> invoice_id
    const invoiceMap = new Map<string, string>();
    existingInvoices?.forEach(inv => invoiceMap.set(inv.reference_month, inv.id));

    // A fatura do PDF atual já foi criada acima — garantir que está no mapa
    invoiceMap.set(parsed.reference_month, invoiceId);

    // Criar faturas faltantes (meses futuros projetados pelas parcelas)
    for (const month of allCompetenceMonths) {
      if (!invoiceMap.has(month)) {
        // Calcular a data de vencimento projetada para esta fatura
        const [fYear, fMonth] = month.split('-').map(Number);
        const projectedDueDate = `${fYear}-${String(fMonth).padStart(2, '0')}-${String(cardData.due_day).padStart(2, '0')}`;

        const { data: newFutureInvoice, error: futureInvError } = await supabase
          .from("invoices")
          .insert({
            card_id: cardId,
            reference_month: month,
            due_date: projectedDueDate,
            closing_date: null,
            total_amount: 0,
            status: "projected",
          })
          .select("id")
          .single();

        if (!futureInvError && newFutureInvoice) {
          invoiceMap.set(month, newFutureInvoice.id);
        }
      }
    }

    // --- DEDUPLICAÇÃO E VÍNCULO DE COMPETÊNCIA (FINGERPRINTING) ---
    const transactionsToInsert = [];
    const transactionsToUpdate = [];

    for (const tx of finalTransactions) {
      const fingerprint = calculateFingerprint(tx);
      const reference_month = calculateCompetenceDate(cardData, tx.transaction_date);
      const existing = fingerprintMap.get(fingerprint);

      // Vincular à fatura correta via mapa (NUNCA null para meses conhecidos)
      const targetInvoiceId = invoiceMap.get(reference_month) || null;

      const txData = {
        ...tx,
        fingerprint,
        competence_date: reference_month,
        invoice_id: targetInvoiceId,
        is_recurring: false,
        notes: "",
      };
      delete txData.installment_index;

      if (existing) {
        if (existing.is_deleted) continue;

        const needsLink = !existing.invoice_id && txData.invoice_id;
        const needsConfirmation = existing.is_projection && !tx.is_projection;

        if (needsConfirmation || needsLink) {
          transactionsToUpdate.push({ 
            id: existing.id, 
            ...txData, 
            is_projection: tx.is_projection
          });
        }
      } else {
        transactionsToInsert.push({ ...txData, is_deleted: false });
      }
    }

    if (transactionsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("transactions").insert(transactionsToInsert);
      if (insertError) throw insertError;
    }

    if (transactionsToUpdate.length > 0) {
      for (const tx of transactionsToUpdate) {
        await supabase.from("transactions").update(tx).eq("id", tx.id);
      }
    }


    const categorizedCount = transactionsToInsert.filter(
      (tx) => tx.category_id !== null
    ).length;

    return NextResponse.json({
      success: true,
      invoice_id: invoiceId,
      bank: parsed.bank,
      total_amount: parsed.total_amount,
      transactions_count: parsed.transactions.length,
      categorized_count: categorizedCount,
      due_date: parsed.due_date,
      reference_month: parsed.reference_month,
      cycle_adjusted: cycleAdjusted,
      new_closing_day: pdfClosingDay,
      checksum_warning: checksumWarning,
    });
  } catch (err: any) {
    console.error("[Upload] Erro fatal:", err);
    // Tenta extrair a mensagem mais útil possível (erros do Supabase vêm em err.message ou err.details)
    const errorMessage = err.message || (typeof err === 'string' ? err : "Erro interno desconhecido");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}