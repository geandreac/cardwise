"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type RateioItem = {
  buyer_id: string | null;
  buyer_name: string;
  total_amount: number;
  percentage: number;
  color: string;
};

const COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#10b981", // emerald
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export function useRateio(mes: string) {
  const [dados, setDados] = useState<RateioItem[]>([]);
  const [totalMes, setTotalMes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const carregarRateio = useCallback(async () => {
    if (!mes) return;

    try {
      setIsLoading(true);
      setIsError(false);

      const inicio = `${mes}-01`;
      const d = new Date(mes + "-01");
      const ano = d.getFullYear();
      const m = d.getMonth() + 1;
      const isBissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
      const dias = [31, isBissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const ultimo = dias[m - 1];
      const fim = `${mes}-${String(ultimo).padStart(2, "0")}`;

      // 1. Busca transações
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select(`
          amount,
          buyer_id
        `)
        .gte("competence_date", inicio)
        .lte("competence_date", fim);

      if (txError) throw txError;

      // 2. Busca todos os compradores
      const { data: buyersData, error: buyersError } = await supabase
        .from("buyers")
        .select("id, name");

      if (buyersError) throw buyersError;

      const buyersMap = new Map(buyersData.map(b => [b.id, b.name]));

      let totalGeral = 0;
      const mapa = new Map<string, { name: string; amount: number }>();

      for (const tx of txData) {
        totalGeral += tx.amount;
        const bId = tx.buyer_id || "EU";
        const bName = tx.buyer_id ? (buyersMap.get(tx.buyer_id) || "Desconhecido") : "Eu";

        if (!mapa.has(bId)) {
          mapa.set(bId, { name: bName, amount: 0 });
        }
        mapa.get(bId)!.amount += tx.amount;
      }

      const rateio: RateioItem[] = Array.from(mapa.entries())
        .map(([id, info], index) => ({
          buyer_id: id === "EU" ? null : id,
          buyer_name: info.name,
          total_amount: info.amount,
          percentage: totalGeral > 0 ? (info.amount / totalGeral) * 100 : 0,
          color: id === "EU" ? "#3b82f6" : COLORS[(index - 1) % COLORS.length] || COLORS[1],
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      setTotalMes(totalGeral);
      setDados(rateio);
    } catch (error) {
      console.error("Erro ao carregar rateio:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [mes]);

  useEffect(() => {
    carregarRateio();
  }, [carregarRateio]);

  return { dados, totalMes, isLoading, isError };
}
