// src/app/dashboard/projecoes/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { useCartoes } from "@/hooks/useCartoes";
import { supabase } from "@/lib/supabase";
import { formatMoeda } from "@/lib/utils";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { CalendarDays, TrendingDown, CreditCard, DollarSign } from "lucide-react";

const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  color: "#f1f5f9",
  fontSize: "12px",
};

const MESES_NOMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type FutureInstallment = {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  competence_date: string;
  installment_info: string | null;
  card_nickname?: string;
  card_id: string;
};

export default function ProjecoesPage() {
  const { cartoes, isLoading: cartoesLoading, gasto_total, limite_total } = useCartoes();
  const [futureData, setFutureData] = useState<FutureInstallment[]>([]);
  const [isLoadingFuture, setIsLoadingFuture] = useState(true);

  // Fetch future transactions (competence_date > current month)
  useEffect(() => {
    async function fetchFuture() {
      setIsLoadingFuture(true);
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("transactions")
        .select("id, merchant_name, amount, transaction_date, competence_date, installment_info, card_id")
        .gt("competence_date", currentMonth)
        .eq("is_deleted", false)
        .order("competence_date", { ascending: true })
        .order("transaction_date", { ascending: true });

      if (!error && data) {
        setFutureData(data as FutureInstallment[]);
      }
      setIsLoadingFuture(false);
    }
    fetchFuture();
  }, []);

  // Map card_id -> nickname
  const cardNickMap = useMemo(() => {
    const map = new Map<string, string>();
    cartoes.forEach(c => map.set(c.id, c.nickname));
    return map;
  }, [cartoes]);

  // Group by competence month
  const monthlyData = useMemo(() => {
    const grouped = new Map<string, { total: number; items: FutureInstallment[] }>();

    futureData.forEach(tx => {
      const cm = tx.competence_date;
      if (!grouped.has(cm)) grouped.set(cm, { total: 0, items: [] });
      const g = grouped.get(cm)!;
      g.total += tx.amount;
      g.items.push({ ...tx, card_nickname: cardNickMap.get(tx.card_id) || "—" });
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        const [y, m] = month.split("-").map(Number);
        return {
          month,
          label: `${MESES_NOMES[m - 1]}/${y}`,
          total: data.total,
          items: data.items,
        };
      });
  }, [futureData, cardNickMap]);

  // Chart data
  const chartData = useMemo(() => {
    return monthlyData.map(m => ({
      name: m.label,
      valor: Math.round(m.total * 100) / 100,
    }));
  }, [monthlyData]);

  // KPIs
  const totalFuturo = futureData.reduce((acc, tx) => acc + tx.amount, 0);
  const mesesComParcela = monthlyData.length;
  const maiorMes = monthlyData.reduce((max, m) => m.total > max ? m.total : max, 0);

  const isLoading = cartoesLoading || isLoadingFuture;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-28 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">Projeções</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Compromisso Futuro", value: formatMoeda(totalFuturo), color: "text-red-400", icon: <TrendingDown className="h-4 w-4 text-red-400" /> },
          { label: "Meses com Parcela", value: `${mesesComParcela} meses`, color: "text-yellow-400", icon: <CalendarDays className="h-4 w-4 text-yellow-400" /> },
          { label: "Mês Mais Pesado", value: formatMoeda(maiorMes), color: "text-orange-400", icon: <DollarSign className="h-4 w-4 text-orange-400" /> },
          { label: "Limite Disponível Real", value: formatMoeda(limite_total - gasto_total - totalFuturo), color: limite_total - gasto_total - totalFuturo > 0 ? "text-green-400" : "text-red-400", icon: <CreditCard className="h-4 w-4 text-green-400" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              {icon}
              <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
            </div>
            <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {futureData.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center rounded-2xl border border-dashed border-white/[0.06] bg-slate-900/40">
          <div className="text-4xl opacity-20">📊</div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-300">Nenhuma parcela futura encontrada</p>
            <p className="text-xs text-slate-500">Envie um PDF com compras parceladas ou crie uma transação parcelada.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Gráfico de Barras */}
          <div className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4">
            <h2 className="mb-4 text-sm font-semibold text-white">Compromissos por Mês</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={54} />
                <Tooltip
                  formatter={(v: any) => [formatMoeda(Number(v)), "Total"]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={idx === 0 ? "#f97316" : "#3b82f6"} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Lista detalhada por mês */}
          <div className="space-y-3">
            {monthlyData.map(m => (
              <div key={m.month} className="rounded-2xl border border-white/[0.06] bg-slate-900/80 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-sm font-semibold text-white">{m.label}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                      {m.items.length} parcela{m.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-red-400">
                    {formatMoeda(m.total)}
                  </span>
                </div>
                <ul className="divide-y divide-white/[0.04]">
                  {m.items.map(tx => (
                    <li key={tx.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm text-white">{tx.merchant_name}</p>
                          {tx.installment_info && (
                            <span className="shrink-0 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-purple-400">
                              {tx.installment_info}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {tx.card_nickname} · {new Date(tx.transaction_date + 'T00:00:00').toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-red-400 ml-3">
                        {formatMoeda(tx.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}