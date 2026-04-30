"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";

export type Perfil = {
  id: string;
  auth_user_id: string;
  full_name: string;
  avatar_url: string | null;
  currency: string;
  monthly_limit: number | null;
  created_at: string;
};

async function fetchPerfil(): Promise<Perfil> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, auth_user_id, full_name, avatar_url, currency, monthly_limit, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as Perfil;
}

export function usePerfil() {
  const { data, error, isLoading, mutate } = useSWR<Perfil>(
    "perfil",
    fetchPerfil,
    { revalidateOnFocus: false }
  );

  async function atualizarPerfil(input: {
    full_name?: string;
    currency?: string;
    monthly_limit?: number | null;
  }) {
    const { error } = await supabase
      .from("profiles")
      .update(input)
      .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
    if (error) throw new Error(error.message);
    await mutate();
  }

  return {
    perfil:           data ?? null,
    isLoading,
    isError:          !!error,
    atualizarPerfil,
  };
}