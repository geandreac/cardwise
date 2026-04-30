"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";

export type GastoPorCategoria = { name: string; valor: number; emoji: string };
export type GastoPorMes       = { mes: string; valor: number };
export type GastoPorCartao    = { name: string; valor: number; theme: string };

export type Analytics = {
  porCategoria: GastoPorCategoria[];
  porMes:       GastoPorMes[];
  porCartao:    GastoPorCartao[];
};

type TxRow = {
  amount: number;
  transaction_date: string;
  card_id: string;
  cards:      { nickname: string; theme_color: string } | null;
  categories: { name: string; emoji: string }           | null;
};

async function fetchAnalytics(): Promise<Analytics> {
  // últimos 6 meses
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - 5);
  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      amount, transaction_date, card_id,
      cards ( nickname, theme_color ),
      categories ( name, emoji )
    `)
    .gte("transaction_date", inicio.toISOString());

  if (error) throw new Error(error.message);

  const rows = (data as unknown as TxRow[]) ?? [];

  // ── por categoria ──────────────────────────────────────────────────────────
  const catMap = new Map<string, { valor: number; emoji: string }>();
  for (const t of rows) {
    const nome  = t.categories?.name  ?? "Outros";
    const emoji = t.categories?.emoji ?? "💳";
    const prev  = catMap.get(nome) ?? { valor: 0, emoji };
    catMap.set(nome, { valor: prev.valor + t.amount, emoji });
  }
  const porCategoria = [...catMap.entries()]
    .sort((a, b) => b[1].valor - a[1].valor)
    .slice(0, 6)
    .map(([name, { valor, emoji }]) => ({ name, valor, emoji }));

  // ── por mês ────────────────────────────────────────────────────────────────
  const mesMap = new Map<string, number>();
  for (const t of rows) {
    const mes = t.transaction_date.slice(0, 7); // YYYY-MM
    mesMap.set(mes, (mesMap.get(mes) ?? 0) + t.amount);
  }
  const porMes = [...mesMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, valor]) => {
      const [ano, m] = mes.split("-");
      const label = new Date(Number(ano), Number(m) - 1, 1)
        .toLocaleDateString("pt-BR", { month: "short" });
      return { mes: label, valor };
    });

  // ── por cartão ─────────────────────────────────────────────────────────────
  const cardMap = new Map<string, { valor: number; name: string; theme: string }>();
  for (const t of rows) {
    const id    = t.card_id;
    const name  = t.cards?.nickname    ?? "—";
    const theme = t.cards?.theme_color ?? "blue";
    const prev  = cardMap.get(id) ?? { valor: 0, name, theme };
    cardMap.set(id, { valor: prev.valor + t.amount, name, theme });
  }
  const porCartao = [...cardMap.values()]
    .sort((a, b) => b.valor - a.valor);

  return { porCategoria, porMes, porCartao };
}

export function useAnalytics() {
  const { data, error, isLoading } = useSWR<Analytics>(
    "analytics",
    fetchAnalytics,
    { revalidateOnFocus: false, dedupingInterval: 120_000 }
  );

  return {
    analytics: data ?? { porCategoria: [], porMes: [], porCartao: [] },
    isLoading,
    isError: !!error,
  };
}