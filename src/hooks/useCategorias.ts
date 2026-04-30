// src/hooks/useCategorias.ts
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export type Categoria = {
  label: string;
  valor: number;
  percent: number;
};

export function useCategorias() {
  const { data, error, isLoading } = useSWR<Categoria[]>(
    "/api/categorias",
    fetcher
  );

  return {
    categorias: data ?? [],
    isLoading,
    isError: !!error,
  };
}