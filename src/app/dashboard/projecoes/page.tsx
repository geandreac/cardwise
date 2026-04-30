// src/app/dashboard/projecoes/page.tsx
"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { useCartoes } from "@/hooks/useCartoes";
import { formatMoeda } from "@/lib/utils";
import { Skeleton } from "@/components/compartilhado/Skeleton";

const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  color: "#f1f5f9",
  fontSize: "12px",
};

function fmtTooltip(v: unknown) {
  return typeof v === "number" ? formatMoeda(v) : String(v ?? "");
}

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function ProjecoesPage() {
  const { cartoes, isLoading, gasto_total, limite_total } = useCartoes();

  const [reducao,      setReducao]      = useState(0);
  const [aporteMensal, setAporteMensal] = useState(0);
  const [mesesProj,    setMesesProj]    = useState(6);

  const gastoAtual     = gasto_total;
  const gastoProjetado = gastoAtual * (1 - reducao / 100);
  const economia       = gastoAtual - gastoProjetado + aporteMensal;

  const dadosProjecao = useMemo(() => {
    const hoje = new Date();
    return Array.from({ length: mesesProj }, (_, i) => {
      const d   = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mes = MESES[d.getMonth()];
      return {
        mes,
        gasto:        gastoProjetado,
        atual:        gastoAtual,
        economiaAcum: economia * (i + 1),
      };
    });
  }, [gastoAtual, gastoProjetado, economia, mesesProj]);

  const economiaAnual    = economia * 12;
  const mesesParaLimite  = limite_total > 0 && gastoProjetado > 0
    ? Math.ceil(limite_total / gastoProjetado)
    : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-28 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-xl font-bold text-white">Projeções</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Gasto atual/mês", value: formatMoeda(gastoAtual),    color: "text-white"      },
          { label: "Limite total",    value: formatMoeda(limite_total),   color: "text-blue-400"   },
          { label: "Gasto projetado", value: formatMoeda(gastoProjetado), color: "text-yellow-400" },
          { label: "Economia/ano",    value: formatMoeda(economiaAnual),  color: "text-green-400"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
            <p className={`mt-1 text-sm font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Simulador */}
      <div className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-5 space-y-5">
        <h2 className="text-sm font-semibold text-white">Simulador &ldquo;E se...&rdquo;</h2>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Se eu reduzir meus gastos em</span>
            <span className="font-semibold text-yellow-400">{reducao}%</span>
          </div>
          <input type="range" min={0} max={80} step={5} value={reducao}
            onChange={(e) => setReducao(Number(e.target.value))}
            className="w-full accent-yellow-400" />
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>0%</span><span>80%</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Pagamento extra mensal</span>
            <span className="font-semibold text-green-400">{formatMoeda(aporteMensal)}</span>
          </div>
          <input type="range" min={0} max={2000} step={50} value={aporteMensal}
            onChange={(e) => setAporteMensal(Number(e.target.value))}
            className="w-full accent-green-400" />
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>R$ 0</span><span>R$ 2.000</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Horizonte de projeção</span>
            <span className="font-semibold text-blue-400">{mesesProj} meses</span>
          </div>
          <input type="range" min={3} max={24} step={3} value={mesesProj}
            onChange={(e) => setMesesProj(Number(e.target.value))}
            className="w-full accent-blue-400" />
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>3 meses</span><span>24 meses</span>
          </div>
        </div>

        {economia > 0 && (
          <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
            <p className="text-xs text-green-400 font-medium">
              💡 Com essas mudanças, você economizaria{" "}
              <span className="font-bold">{formatMoeda(economiaAnual)}</span> em 12 meses.
              {mesesParaLimite && mesesParaLimite > 0 && (
                <> Seu limite total duraria aproximadamente{" "}
                <span className="font-bold">{mesesParaLimite} meses</span> no ritmo projetado.</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Gráfico */}
      <div className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4">
        <h2 className="mb-4 text-sm font-semibold text-white">Projeção de Gastos</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dadosProjecao} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="mes" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip formatter={fmtTooltip} contentStyle={TOOLTIP_STYLE} />
            <ReferenceLine
              y={mesesProj > 0 ? limite_total / mesesProj : 0}
              stroke="rgba(239,68,68,0.4)"
              strokeDasharray="4 4"
              label={{ value: "Limite", fill: "#ef4444", fontSize: 10 }}
            />
            <Line type="monotone" dataKey="atual"        stroke="rgba(100,116,139,0.5)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Gasto atual" />
            <Line type="monotone" dataKey="gasto"        stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} name="Gasto projetado" />
            <Line type="monotone" dataKey="economiaAcum" stroke="#10b981" strokeWidth={2} dot={false} name="Economia acumulada" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Por cartão */}
      {cartoes.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Impacto por Cartão</h2>
          <div className="space-y-2">
            {cartoes.map((c) => {
              const projetado  = c.current_spend * (1 - reducao / 100);
              const novoPercent = c.credit_limit > 0
                ? Math.round((projetado / c.credit_limit) * 100)
                : 0;
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-28 truncate text-xs text-slate-400">{c.nickname}</span>
                  <div className="flex-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.min(novoPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-24 text-right text-xs tabular-nums text-slate-400">
                    {formatMoeda(projetado)}{" "}
                    <span className="text-slate-600">({novoPercent}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}