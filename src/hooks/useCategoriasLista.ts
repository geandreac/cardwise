import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export type CategoriaItem = {
  id: string;
  name: string;
  emoji: string;
};

export function useCategoriasLista() {
  const { data, error, isLoading } = useSWR<CategoriaItem[]>(
    "/api/categorias/lista",
    fetcher
  );

  return {
    categorias: data ?? [],
    isLoading,
    isError: !!error,
  };
}