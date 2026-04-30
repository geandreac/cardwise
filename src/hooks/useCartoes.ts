// src/hooks/useCartoes.ts
"use client";

import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase";
import { calcPorcentagemUso } from "@/lib/utils";
import type { ICard, CardBrand, CardTheme } from "@/types";

// ─── tipo estendido ───────────────────────────────────────────────────────────

export type CardComGasto = ICard & {
  current_spend: number;
  usage_percent: number;
};

// ─── fetcher ──────────────────────────────────────────────────────────────────

async function fetchCartoes(): Promise<CardComGasto[]> {
  const { data: cards, error } = await supabase
    .from("cards")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!cards || cards.length === 0) return [];

  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  return Promise.all(
    cards.map(async (card) => {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq("card_id", card.id)
        .eq("reference_month", mesAtual)
        .maybeSingle();

      const current_spend: number = invoice?.total_amount ?? 0;
      const usage_percent = calcPorcentagemUso(current_spend, card.credit_limit);

      return {
        id:           card.id as string,
        profile_id:   card.profile_id as string,
        nickname:     card.nickname as string,
        brand:        card.brand as CardBrand,
        last_four:    card.last_four as string,
        holder_name:  card.holder_name as string,
        credit_limit: card.credit_limit as number,
        due_day:      card.due_day as number,
        closing_day:  card.closing_day as number,
        theme_color:  card.theme_color as CardTheme,
        is_active:    card.is_active as boolean,
        created_at:   card.created_at as string,
        updated_at:   card.updated_at as string,
        current_spend,
        usage_percent,
      };
    })
  );
}

// ─── constante de cache ───────────────────────────────────────────────────────

const CACHE_KEY = "cartoes";

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useCartoes() {
  const { data, error, isLoading } = useSWR<CardComGasto[]>(
    CACHE_KEY,
    fetchCartoes,
    { revalidateOnFocus: true, dedupingInterval: 30_000 }
  );

  // ── mutations ──────────────────────────────────────────────────────────────

  async function criarCartao(
    input: Pick<
      ICard,
      "nickname" | "brand" | "last_four" | "holder_name" |
      "credit_limit" | "due_day" | "closing_day" | "theme_color"
    >
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Busca o id real do perfil via auth_user_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Perfil não encontrado");

    const { error } = await supabase.from("cards").insert({
      profile_id:   profile.id,
      nickname:     input.nickname,
      brand:        input.brand,
      last_four:    input.last_four,
      holder_name:  input.holder_name,
      credit_limit: input.credit_limit,
      due_day:      input.due_day,
      closing_day:  input.closing_day,
      theme_color:  input.theme_color,
    });
    if (error) throw new Error(error.message);
    await mutate(CACHE_KEY);
  }

  async function atualizarCartao(
    id: string,
    input: Partial<Pick<ICard, "nickname" | "credit_limit" | "theme_color">>
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

  // ── KPIs calculados aqui — nunca na UI ────────────────────────────────────

  const cartoes = data ?? [];
  const limite_total      = cartoes.reduce((acc, c) => acc + c.credit_limit, 0);
  const gasto_total       = cartoes.reduce((acc, c) => acc + c.current_spend, 0);
  const limite_disponivel = limite_total - gasto_total;
  const uso_percentual    = calcPorcentagemUso(gasto_total, limite_total);

  return {
    cartoes,
    isLoading,
    isError:      !!error,
    errorMessage: error?.message ?? null,
    limite_total,
    gasto_total,
    limite_disponivel,
    uso_percentual,
    criarCartao,
    atualizarCartao,
    desativarCartao,
  };
}