"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";

export type AlertSeverity = "info" | "warning" | "danger";

export type Alerta = {
  id: string;
  message: string;
  type: string;
  severity: AlertSeverity;
  is_read: boolean;
  created_at: string;
};

async function fetchAlertas(): Promise<Alerta[]> {
  const { data, error } = await supabase
    .from("alerts")
    .select("id, message, type, severity, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);
  return (data ?? []) as Alerta[];
}

export function useAlertas() {
  const { data, error, isLoading, mutate } = useSWR<Alerta[]>(
    "alertas",
    fetchAlertas,
    { revalidateOnFocus: true, dedupingInterval: 60_000 }
  );

  async function marcarComoLido(id: string) {
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await mutate();
  }

  async function marcarTodosLidos() {
    const naoLidos = (data ?? []).filter((a) => !a.is_read).map((a) => a.id);
    if (naoLidos.length === 0) return;
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .in("id", naoLidos);
    if (error) throw new Error(error.message);
    await mutate();
  }

  const naoLidos = (data ?? []).filter((a) => !a.is_read).length;

  return {
    alertas: data ?? [],
    isLoading,
    isError: !!error,
    naoLidos,
    marcarComoLido,
    marcarTodosLidos,
  };
}