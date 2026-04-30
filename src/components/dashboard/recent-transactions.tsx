// src/components/dashboard/recent-transactions.tsx
"use client";

import { useTransacoes } from "@/hooks/useTransacoes";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { formatMoeda } from "@/lib/utils";

function formatDataHora(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);

  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (data.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`;
  if (data.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function RecentTransactions() {
  const { transacoes, isLoading, isError } = useTransacoes(5);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4">
        <Skeleton className="mb-3 h-4 w-36 rounded" />
        <div className="divide-y divide-white/[0.05]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-2.5 w-16 rounded" />
              </div>
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isError || transacoes.length === 0) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Últimas Transações</h2>
        <p className="text-center text-xs text-slate-500 py-6">
          {isError ? "Erro ao carregar transações" : "Nenhuma transação registrada"}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">Últimas Transações</h2>
      <ul className="divide-y divide-white/[0.05]" role="list">
        {transacoes.map((tx) => (
          <li key={tx.id} className="flex items-center gap-3 py-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800 text-base">
              {tx.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{tx.descricao}</p>
              <p className="text-[10px] text-slate-500">{formatDataHora(tx.data_hora)}</p>
            </div>
            <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-red-400">
              - {formatMoeda(tx.valor)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}