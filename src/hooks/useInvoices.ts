"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";

export type InvoiceStatus = "open" | "closed" | "paid" | "overdue";

export type Invoice = {
  id: string;
  card_id: string;
  card_nickname: string;
  card_brand: string;
  card_theme: string;
  reference_month: string;
  closing_date: string;
  due_date: string;
  total_amount: number;
  status: InvoiceStatus;
  paid_at: string | null;
  card_closing_day: number;
  card_due_day: number;
};

type InvoiceRow = {
  id: string;
  card_id: string;
  reference_month: string;
  closing_date: string;
  due_date: string;
  total_amount: number;
  status: string;
  paid_at: string | null;
  cards: {
    nickname: string;
    brand: string;
    theme_color: string;
    closing_day: number;
    due_day: number;
  } | null;
};

async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      id,
      card_id,
      reference_month,
      closing_date,
      due_date,
      total_amount,
      status,
      paid_at,
      cards ( nickname, brand, theme_color, closing_day, due_day )
    `)
    .order("reference_month", { ascending: false });

  if (error) throw new Error(error.message);

  return (data as unknown as InvoiceRow[] ?? []).map((i) => ({
    id:              i.id,
    card_id:         i.card_id,
    card_nickname:   i.cards?.nickname    ?? "—",
    card_brand:      i.cards?.brand       ?? "other",
    card_theme:      i.cards?.theme_color ?? "blue",
    reference_month: i.reference_month,
    closing_date:    i.closing_date,
    due_date:        i.due_date,
    total_amount:    i.total_amount,
    status:          i.status as InvoiceStatus,
    paid_at:         i.paid_at,
    card_closing_day: i.cards?.closing_day ?? 0,
    card_due_day:     i.cards?.due_day     ?? 0,
  }));
}

export function useInvoices() {
  const { data, error, isLoading, mutate } = useSWR<Invoice[]>(
    "invoices",
    fetchInvoices,
    { revalidateOnFocus: true, dedupingInterval: 30_000 }
  );

  async function marcarComoPaga(id: string) {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await mutate();
  }

  return {
    invoices:      data ?? [],
    isLoading,
    isError:       !!error,
    marcarComoPaga,
  };
}