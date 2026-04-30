"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type TransacaoFull = {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  is_recurring: boolean;
  installment_info: string | null;
  notes: string;
  card_id: string;
  card_nickname: string;
  card_brand: string;
  card_theme: string;
  category_id: string | null;
  category_name: string;
  category_emoji: string;
};

type Filtros = {
  busca: string;
  cartao_id: string;
  categoria_id: string;
  mes: string; // YYYY-MM
};

type TransacaoRow = {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  is_recurring: boolean;
  installment_info: string | null;
  notes: string;
  card_id: string;
  category_id: string | null;
  cards: { nickname: string; brand: string; theme_color: string } | null;
  categories: { name: string; emoji: string } | null;
};

const PAGE_SIZE = 15;

export function useTransacoesFull(filtros: Filtros) {
  const [transacoes, setTransacoes] = useState<TransacaoFull[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [isError, setIsError]       = useState(false);
  const [pagina, setPagina]         = useState(1);
  const [temMais, setTemMais]       = useState(false);

  const carregar = useCallback(async (pag: number) => {
    setIsLoading(true);
    setIsError(false);

    try {
      const inicio = filtros.mes
        ? `${filtros.mes}-01`
        : undefined;
      const fim = filtros.mes
        ? `${filtros.mes}-31`
        : undefined;

      let query = supabase
        .from("transactions")
        .select(`
          id, merchant_name, amount, transaction_date,
          is_recurring, installment_info, notes, card_id, category_id,
          cards ( nickname, brand, theme_color ),
          categories ( name, emoji )
        `)
        .order("transaction_date", { ascending: false })
        .range((pag - 1) * PAGE_SIZE, pag * PAGE_SIZE - 1);

      if (filtros.busca)       query = query.ilike("merchant_name", `%${filtros.busca}%`);
      if (filtros.cartao_id)   query = query.eq("card_id", filtros.cartao_id);
      if (filtros.categoria_id) query = query.eq("category_id", filtros.categoria_id);
      if (inicio)              query = query.gte("transaction_date", inicio);
      if (fim)                 query = query.lte("transaction_date", fim);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data as unknown as TransacaoRow[]) ?? [];

      const mapeadas: TransacaoFull[] = rows.map((t) => ({
        id:               t.id,
        merchant_name:    t.merchant_name,
        amount:           t.amount,
        transaction_date: t.transaction_date,
        is_recurring:     t.is_recurring,
        installment_info: t.installment_info,
        notes:            t.notes,
        card_id:          t.card_id,
        category_id:      t.category_id,
        card_nickname:    t.cards?.nickname    ?? "—",
        card_brand:       t.cards?.brand       ?? "other",
        card_theme:       t.cards?.theme_color ?? "blue",
        category_name:    t.categories?.name   ?? "Outros",
        category_emoji:   t.categories?.emoji  ?? "💳",
      }));

      setTransacoes((prev) => pag === 1 ? mapeadas : [...prev, ...mapeadas]);
      setTemMais(rows.length === PAGE_SIZE);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    setPagina(1);
    carregar(1);
  }, [carregar]);

  function carregarMais() {
    const prox = pagina + 1;
    setPagina(prox);
    carregar(prox);
  }

  return { transacoes, isLoading, isError, temMais, carregarMais };
}