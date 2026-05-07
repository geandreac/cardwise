"use client";

import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase";
import { calcPorcentagemUso } from "@/lib/utils";
import type { ICard, CardBrand, CardTheme } from "@/types";

export type CardComGasto = ICard & {
  current_spend: number;
  usage_percent: number;
  next_month_spend: number;
  future_installments_total: number;
};

function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function mesSeguinte(): string {
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
}

function temParcelaFutura(installmentInfo: string): boolean {
  const [atual, total] = installmentInfo.split("/").map(Number);
  if (!atual || !total) return false;
  return atual < total;
}

async function fetchCartoes(): Promise<CardComGasto[]> {
  const { data: cards, error } = await supabase
    .from("cards")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!cards || cards.length === 0) return [];

  const referenciaAtual = mesAtual();
  const referenciaProxima = mesSeguinte();

  return Promise.all(
    cards.map(async (card) => {
      const { data: invoiceAtual } = await supabase
        .from("invoices")
        .select("id, total_amount, status")
        .eq("card_id", card.id)
        .eq("reference_month", referenciaAtual)
        .maybeSingle();

      const current_spend = (invoiceAtual?.status !== "paid") ? (invoiceAtual?.total_amount ?? 0) : 0;
      const usage_percent = calcPorcentagemUso(current_spend, card.credit_limit);

      let next_month_spend = 0;

      const { data: invoiceProxima } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq("card_id", card.id)
        .eq("reference_month", referenciaProxima)
        .maybeSingle();

      if (invoiceProxima) {
        next_month_spend = invoiceProxima.total_amount ?? 0;
      } else if (invoiceAtual?.id) {
        const { data: parcelas } = await supabase
          .from("transactions")
          .select("amount, installment_info")
          .eq("invoice_id", invoiceAtual.id)
          .not("installment_info", "is", null);

        next_month_spend = (parcelas ?? []).reduce((acc, tx) => {
          if (
            tx.installment_info &&
            temParcelaFutura(tx.installment_info as string)
          ) {
            return acc + (tx.amount ?? 0);
          }
          return acc;
        }, 0);
      }

      // Calcular total de parcelas futuras (todas as faturas projetadas)
      const { data: futureTransactions } = await supabase
        .from("transactions")
        .select("amount, competence_date")
        .eq("card_id", card.id)
        .gt("competence_date", referenciaAtual)
        .eq("is_deleted", false);

      const future_installments_total = (futureTransactions ?? []).reduce(
        (acc, tx) => acc + (tx.amount ?? 0), 0
      );

      return {
        id: card.id as string,
        profile_id: card.profile_id as string,
        nickname: card.nickname as string,
        brand: card.brand as CardBrand,
        last_four: card.last_four as string,
        holder_name: card.holder_name as string,
        credit_limit: card.credit_limit as number,
        due_day: card.due_day as number,
        closing_day: card.closing_day as number,
        days_between_closing_and_due: (card.days_between_closing_and_due ?? 7) as number,
        due_next_month: card.due_next_month as boolean,
        theme_color: card.theme_color as CardTheme,
        is_active: card.is_active as boolean,
        created_at: card.created_at as string,
        updated_at: card.updated_at as string,
        current_spend,
        usage_percent,
        next_month_spend,
        future_installments_total,
      };
    })
  );
}

const CACHE_KEY = "cartoes";

export function useCartoes() {
  const { data, error, isLoading } = useSWR<CardComGasto[]>(
    CACHE_KEY,
    fetchCartoes,
    { revalidateOnFocus: true, dedupingInterval: 30_000 }
  );

  async function criarCartao(
    input: Pick<
      ICard,
      | "nickname"
      | "brand"
      | "last_four"
      | "holder_name"
      | "credit_limit"
      | "due_day"
      | "closing_day"
      | "days_between_closing_and_due"
      | "due_next_month"
      | "theme_color"
    >
  ): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Usuário não autenticado");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Perfil não encontrado");

    const { error } = await supabase.from("cards").insert({
      profile_id: profile.id,
      nickname: input.nickname,
      brand: input.brand,
      last_four: input.last_four,
      holder_name: input.holder_name,
      credit_limit: input.credit_limit,
      due_day: input.due_day,
      closing_day: input.closing_day,
      days_between_closing_and_due: input.days_between_closing_and_due,
      due_next_month: input.due_next_month,
      theme_color: input.theme_color,
    });

    if (error) {
      if (error.message.includes("days_between_closing_and_due")) {
        throw new Error("Atenção: Você precisa adicionar a nova coluna ao banco de dados. Por favor, execute o conteúdo do arquivo 'sql/migrations/016_add_smart_cycle_fields.sql' no SQL Editor do seu Supabase.");
      }
      throw new Error(error.message);
    }
    await mutate(CACHE_KEY);
  }

  async function atualizarCartao(
    id: string,
    input: Partial<ICard>
  ): Promise<void> {
    const { error } = await supabase
      .from("cards")
      .update(input)
      .eq("id", id);

    if (error) throw new Error(error.message);
    await mutate(CACHE_KEY);
  }

  async function desativarCartao(id: string): Promise<void> {
    const { error } = await supabase
      .from("cards")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw new Error(error.message);
    await mutate(CACHE_KEY);
  }

  const cartoes = data ?? [];
  const limite_total = cartoes.reduce((acc, c) => acc + c.credit_limit, 0);
  const gasto_total = cartoes.reduce((acc, c) => acc + c.current_spend, 0);
  const futuro_total = cartoes.reduce((acc, c) => acc + c.future_installments_total, 0);
  const limite_disponivel = limite_total - (gasto_total + futuro_total);
  const uso_percentual = calcPorcentagemUso(gasto_total, limite_total);
  const projecao_prox_mes = cartoes.reduce(
    (acc, c) => acc + c.next_month_spend,
    0
  );

  return {
    cartoes,
    isLoading,
    isError: !!error,
    errorMessage: error?.message ?? null,
    limite_total,
    gasto_total,
    limite_disponivel,
    uso_percentual,
    projecao_prox_mes,
    criarCartao,
    atualizarCartao,
    desativarCartao,
  };
}