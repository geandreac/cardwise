// src/components/dashboard/categories-overview.tsx
"use client";

import { useCategorias } from "@/hooks/useCategorias";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { formatMoeda } from "@/lib/utils";

const CORES = [
  "bg-amber-400",
  "bg-blue-500",
  "bg-purple-500",
  "bg-cyan-400",
  "bg-emerald-500",
];

export function CategoriesOverview() {
  const { categorias, isLoading, isError } = useCategorias();

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4">
        <Skeleton className="mb-3 h-4 w-32 rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      </section>
    );
  }

  if (isError || categorias.length === 0) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Gastos por Categoria</h2>
        <p className="text-center text-xs text-slate-500 py-6">
          {isError ? "Erro ao carregar categorias" : "Nenhuma transação este mês"}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">Gastos por Categoria</h2>
      <ul className="space-y-3" role="list">
        {categorias.map((cat, i) => (
          <li key={cat.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-slate-300">{cat.label}</span>
              <span className="text-xs tabular-nums text-slate-400">
                {formatMoeda(cat.valor)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${CORES[i % CORES.length]}`}
                style={{ width: `${cat.percent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}