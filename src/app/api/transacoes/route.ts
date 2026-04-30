// src/app/api/transacoes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TransacaoRow = {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  card_id: string;
  cards: { nickname: string } | null;
  categories: { name: string; emoji: string } | null;
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const limite = Number(searchParams.get("limite") ?? 5);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      id,
      merchant_name,
      amount,
      transaction_date,
      card_id,
      cards ( nickname ),
      categories ( name, emoji )
    `)
    .order("transaction_date", { ascending: false })
    .limit(limite);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const transacoes = (data as TransacaoRow[] ?? []).map((t) => ({
    id:             t.id,
    descricao:      t.merchant_name,
    valor:          t.amount,
    categoria:      t.categories?.name ?? "outros",
    emoji:          t.categories?.emoji ?? "💳",
    data_hora:      t.transaction_date,
    cartao_id:      t.card_id,
    cartao_apelido: t.cards?.nickname ?? "—",
  }));

  return NextResponse.json(transacoes);
}