// src/app/api/categorias/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CategoriaRow = {
  amount: number;
  transaction_date: string;
  categories: { name: string } | null;
};

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      amount,
      transaction_date,
      categories ( name )
    `)
    .gte("transaction_date", inicioMes.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mapa = new Map<string, number>();
  for (const t of (data as CategoriaRow[] ?? [])) {
    const nome = t.categories?.name ?? "Outros";
    mapa.set(nome, (mapa.get(nome) ?? 0) + t.amount);
  }

  const total = [...mapa.values()].reduce((s, v) => s + v, 0);

  const categorias = [...mapa.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, valor]) => ({
      label,
      valor,
      percent: total > 0 ? Math.round((valor / total) * 100) : 0,
    }));

  return NextResponse.json(categorias);
}