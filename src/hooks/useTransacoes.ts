// src/hooks/useTransacoes.ts
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export type Transacao = {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  emoji: string;
  data_hora: string;
  cartao_id: string;
  cartao_apelido: string;
};

export function useTransacoes(limite = 5) {
  const { data, error, isLoading } = useSWR<Transacao[]>(
    `/api/transacoes?limite=${limite}`,
    fetcher
  );

  return {
    transacoes: data ?? [],
    isLoading,
    isError: !!error,
  };
}