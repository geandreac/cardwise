"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type Comprador = {
  id: string;
  name: string;
};

export function useCompradores() {
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const carregarCompradores = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("buyers")
        .select("id, name")
        .eq("profile_id", profile.id)
        .order("name", { ascending: true });

      if (error) throw error;

      setCompradores(data || []);
    } catch (error) {
      console.error("Erro ao carregar compradores:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarCompradores();
  }, [carregarCompradores]);

  async function criarComprador(name: string): Promise<Comprador | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (!profile) return null;

      const { data, error } = await supabase
        .from("buyers")
        .insert({ profile_id: profile.id, name })
        .select("id, name")
        .single();

      if (error) throw error;

      setCompradores((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (error) {
      console.error("Erro ao criar comprador:", error);
      return null;
    }
  }

  return {
    compradores,
    isLoading,
    isError,
    carregarCompradores,
    criarComprador,
  };
}
