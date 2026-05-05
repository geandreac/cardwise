"use client";

import { MoreVertical, Trash2, Edit2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { formatMoeda } from "@/lib/utils";
import type { CardComGasto } from "@/hooks/useCartoes";

const gradients: Record<string, string> = {
  blue: "from-blue-600 via-blue-700 to-blue-900",
  green: "from-emerald-500 via-emerald-700 to-emerald-900",
  graphite: "from-slate-500 via-slate-600 to-slate-800",
  purple: "from-violet-600 via-violet-700 to-violet-900",
  lightblue: "from-sky-400 via-sky-500 to-sky-700",
  yellow: "from-yellow-400 via-yellow-500 to-yellow-700",
  black: "from-zinc-800 via-zinc-900 to-black",
  orange: "from-orange-500 via-orange-600 to-orange-800",
};

const brandLabel: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  elo: "ELO",
  amex: "AMEX",
  hipercard: "HIPER",
  other: "—",
};

type Props = {
  cartao: CardComGasto;
  onEdit: (cartao: CardComGasto) => void;
  onDelete: (cartao: CardComGasto) => void;
};

export function CardVisual({ cartao, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const gradient = gradients[cartao.theme_color] ?? gradients.blue;
  const temProjecao = cartao.next_month_spend > 0;

  return (
    <article
      className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} shadow-xl shadow-black/30 select-none`}
    >
      <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/5" />
      <div className="absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-white/5" />

      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
              {brandLabel[cartao.brand]}
            </p>
            <p className="mt-1 text-base font-semibold text-white">
              {cartao.nickname}
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Opções do cartão"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 min-w-[130px] rounded-xl border border-white/10 bg-slate-800 py-1 shadow-xl">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(cartao);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-slate-700"
                >
                  <Edit2 className="h-3 w-3" /> Editar
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(cartao);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 transition-colors hover:bg-slate-700"
                >
                  <Trash2 className="h-3 w-3" /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 font-mono text-sm tracking-[0.22em] text-white/80">
          •••• •••• •••• {cartao.last_four}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-white/50">Fatura atual</p>
            <p className="text-sm font-bold tabular-nums text-white">
              {formatMoeda(cartao.current_spend)}
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="text-[10px] text-white/50">Próx. mês</p>
              {temProjecao && (
                <TrendingUp className="h-3 w-3 text-yellow-300/80" />
              )}
            </div>
            <p
              className={`text-sm font-bold tabular-nums ${
                temProjecao ? "text-yellow-300" : "text-white/40"
              }`}
            >
              {temProjecao ? formatMoeda(cartao.next_month_spend) : "—"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-white/50">Limite</p>
            <p className="text-sm font-bold tabular-nums text-white">
              {formatMoeda(cartao.credit_limit)}
            </p>
          </div>
        </div>
      </div>

      <div className="h-1 w-full bg-white/10">
        <div
          className="h-full bg-white/40 transition-all duration-700"
          style={{ width: `${cartao.usage_percent}%` }}
        />
      </div>
    </article>
  );
}