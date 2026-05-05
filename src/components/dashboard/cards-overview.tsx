"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { useCartoes } from "@/hooks/useCartoes";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { formatMoeda, corPorcentagem } from "@/lib/utils";

type CorType = "green" | "yellow" | "red";

const brandLabel: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  elo: "ELO",
  amex: "AMEX",
  hipercard: "HIPER",
  other: "—",
};

const themeGradient: Record<string, string> = {
  blue: "from-blue-600 to-blue-800",
  green: "from-emerald-600 to-emerald-800",
  graphite: "from-slate-500 to-slate-700",
  purple: "from-violet-600 to-violet-800",
  lightblue: "from-sky-400 to-sky-600",
  yellow: "from-yellow-400 to-yellow-600",
  black: "from-zinc-800 to-black",
  orange: "from-orange-500 to-orange-700",
};

const badgeLabel: Record<CorType, string> = {
  green: "OK",
  yellow: "Atenção",
  red: "Crítico",
};

const badgeClass: Record<CorType, string> = {
  green: "text-green-400 bg-green-400/10",
  yellow: "text-amber-400 bg-amber-400/10",
  red: "text-red-400 bg-red-400/10",
};

const barColor: Record<CorType, string> = {
  green: "bg-blue-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export function CardsOverview() {
  const { cartoes, isLoading, isError } = useCartoes();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-2xl">⚠️</span>
        <p className="text-sm text-slate-400">Erro ao carregar cartões</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-blue-400 underline hover:text-blue-300 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (cartoes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CreditCard className="h-8 w-8 text-slate-600" strokeWidth={1.5} />
        <p className="text-sm text-slate-400">Nenhum cartão cadastrado</p>
        <Link
          href="/dashboard/cartoes"
          className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          Adicionar primeiro cartão →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cartoes.map((card) => {
        const cor = corPorcentagem(card.usage_percent);
        const gradient = themeGradient[card.theme_color] ?? themeGradient.blue;

        return (
          <Link
            key={card.id}
            href={`/dashboard/faturas?cartao=${card.id}`}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-slate-800/50 p-3 transition-all hover:bg-slate-800 hover:border-white/[0.10] active:scale-[0.98]"
          >
            <div
              className={`flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[10px] font-bold text-white ${gradient}`}
            >
              {brandLabel[card.brand]}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-100">
                  {card.nickname}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass[cor]}`}>
                  {badgeLabel[cor]}
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor[cor]}`}
                  style={{ width: `${card.usage_percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>•••• {card.last_four}</span>
                <span>
                  {formatMoeda(card.current_spend)}
                  {" "}<span className="text-slate-600">/</span>{" "}
                  {formatMoeda(card.credit_limit)}
                  {" "}<span className="font-semibold text-slate-300">{card.usage_percent}%</span>
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}