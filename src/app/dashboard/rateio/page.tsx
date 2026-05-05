"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { formatMoeda } from "@/lib/utils";
import { useRateio } from "@/hooks/useRateio";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { Users } from "lucide-react";
import { GlobalMonthPicker } from "@/components/compartilhado/GlobalMonthPicker";
import { useDate } from "@/context/date-context";

export default function RateioPage() {
  const { referenceMonth: mes } = useDate();
  const { dados, totalMes, isLoading, isError } = useRateio(mes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-400" />
            Rateio
          </h1>
          <GlobalMonthPicker />
        </div>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-red-400">
          <p className="text-lg font-medium">Erro ao carregar os dados de rateio.</p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[400px] rounded-3xl" />
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
      ) : dados.length === 0 ? (
        // Estado vazio minimalista
        <div className="flex flex-col items-center gap-4 py-24 text-center border-2 border-dashed border-white/[0.03] rounded-3xl">
          <p className="text-4xl opacity-20 grayscale">🤷‍♂️</p>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-300">Nenhuma compra no mês</p>
            <p className="text-xs text-slate-500">Não há transações registradas para este período.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Gráfico */}
          <div className="rounded-3xl border border-white/[0.06] bg-slate-900/80 p-6 flex flex-col">
            <h2 className="text-base font-semibold text-white mb-6">Distribuição da Fatura</h2>
            <div className="flex-1 min-h-[300px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dados}
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={115}
                    paddingAngle={4}
                    dataKey="total_amount"
                    stroke="transparent"
                  >
                    {dados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => formatMoeda(Number(value || 0))}
                    contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", color: "#fff" }}
                    itemStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Centro do Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Total Geral</p>
                <p className="text-2xl font-bold text-white tabular-nums">{formatMoeda(totalMes)}</p>
              </div>
            </div>
          </div>

          {/* Tabela de Rateio */}
          <div className="rounded-3xl border border-white/[0.06] bg-slate-900/80 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Valores por Pessoa</h2>
              <span className="text-sm font-bold text-red-400">- {formatMoeda(totalMes)}</span>
            </div>

            <div className="space-y-4">
              {dados.map((item) => (
                <div key={item.buyer_id || "eu"} className="group flex items-center justify-between rounded-2xl bg-white/[0.02] p-4 border border-white/[0.04] transition-all hover:bg-white/[0.04] hover:border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xl transition-transform group-hover:scale-105"
                      style={{ 
                        backgroundColor: item.color,
                        boxShadow: `0 8px 16px -4px ${item.color}40`
                      }}
                    >
                      {item.buyer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white tracking-tight">{item.buyer_name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400">
                          {item.percentage.toFixed(1)}%
                        </span>
                        <p className="text-[10px] text-slate-500">participação</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-white tabular-nums tracking-tight">{formatMoeda(item.total_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
