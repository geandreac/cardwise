"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type TransacaoFull = {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  competence_date: string;
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
  buyer_id: string | null;
  buyer_name: string;
};

type Filtros = {
  busca: string;
  cartao_id: string;
  categoria_id: string;
  mes: string; // YYYY-MM
  refreshKey?: number; // força recarregamento após upload
};

type TransacaoRow = {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  competence_date: string;
  is_recurring: boolean;
  installment_info: string | null;
  notes: string;
  card_id: string;
  category_id: string | null;
  buyer_id: string | null;
  cards: { nickname: string; brand: string; theme_color: string } | null;
  categories: { name: string; emoji: string } | null;
  buyers: { name: string } | null;
};

const PAGE_SIZE = 15;

/** Retorna o último dia real do mês — ex: 2026-04 → "2026-04-30" */
function ultimoDiaMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const isBissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  const dias = [31, isBissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const ultimo = dias[m - 1];
  return `${mes}-${String(ultimo).padStart(2, "0")}`;
}

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
      const inicio = filtros.mes ? `${filtros.mes}-01` : undefined;
      const fim    = filtros.mes ? ultimoDiaMes(filtros.mes) : undefined;

      let query = supabase
        .from("transactions")
        .select(`
          id, merchant_name, amount, transaction_date, competence_date,
          is_recurring, installment_info, notes, card_id, category_id, buyer_id,
          cards ( nickname, brand, theme_color ),
          categories ( name, emoji ),
          buyers ( name )
        `)
        .order("transaction_date", { ascending: false })
        .range((pag - 1) * PAGE_SIZE, pag * PAGE_SIZE - 1);

      if (filtros.busca)        query = query.ilike("merchant_name", `%${filtros.busca}%`);
      if (filtros.cartao_id)    query = query.eq("card_id", filtros.cartao_id);
      if (filtros.categoria_id) query = query.eq("category_id", filtros.categoria_id);
      query = query.eq("is_deleted", false);
      
      if (inicio && fim) {
        query = query.gte("competence_date", inicio).lte("competence_date", fim);
      } else {
        // Timeline Global: Carregar histórico recente por padrão (ex: último ano)
        const umAnoAtras = new Date();
        umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
        umAnoAtras.setDate(1);
        query = query.gte("competence_date", umAnoAtras.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data as unknown as TransacaoRow[]) ?? [];

      const mapeadas: TransacaoFull[] = rows.map((t) => ({
        id:               t.id,
        merchant_name:    t.merchant_name,
        amount:           t.amount,
        transaction_date: t.transaction_date,
        competence_date:  t.competence_date,
        is_recurring:     t.is_recurring,
        installment_info: t.installment_info,
        notes:            t.notes,
        card_id:          t.card_id,
        category_id:      t.category_id,
        card_nickname:    t.cards?.nickname    ?? "—",
        card_brand:       t.cards?.brand       ?? "other",
        card_theme:       t.cards?.theme_color ?? "blue",
        category_name:    t.categories?.name   ?? "Sem categoria",
        category_emoji:   t.categories?.emoji  ?? "❔",
        buyer_id:         t.buyer_id,
        buyer_name:       t.buyers?.name       ?? "Eu",
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