"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { formatMoeda } from "@/lib/utils";
import { useRateio } from "@/hooks/useRateio";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { Users } from "lucide-react";

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function RateioPage() {
  const [mes, setMes] = useState(mesAtual());
  const { dados, totalMes, isLoading, isError } = useRateio(mes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-400" />
            Rateio de Compras
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Veja quanto cada pessoa deve pagar na fatura deste mês.
          </p>
        </div>

        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-slate-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
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
        <div className="rounded-3xl border border-white/[0.06] bg-slate-900/60 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-3xl">
            🤷‍♂️
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">Nenhuma compra no mês</h3>
          <p className="mt-2 text-sm text-slate-400">
            Não há transações registradas para este mês de competência.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Gráfico */}
          <div className="rounded-3xl border border-white/[0.06] bg-slate-900/80 p-6 flex flex-col">
            <h2 className="text-base font-semibold text-white mb-6">Distribuição da Fatura</h2>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dados}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={4}
                    dataKey="total_amount"
                    stroke="transparent"
                  >
                    {dados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => formatMoeda(Number(value))}
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                    itemStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
                <div key={item.buyer_id || "eu"} className="flex items-center justify-between rounded-2xl bg-white/[0.02] p-4 border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-inner"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.buyer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.buyer_name}</p>
                      <p className="text-xs text-slate-400">{item.percentage.toFixed(1)}% do total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{formatMoeda(item.total_amount)}</p>
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
