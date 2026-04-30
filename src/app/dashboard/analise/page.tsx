// src/app/dashboard/analise/page.tsx
"use client";

import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { formatMoeda } from "@/lib/utils";

const CARD_COLORS = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4"];

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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4">
      <h2 className="mb-4 text-sm font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

export default function AnalisePage() {
  const { analytics, isLoading, isError } = useAnalytics();
  const { porCategoria, porMes, porCartao } = analytics;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24 rounded-xl" />
        <div className="grid gap-4 xl:grid-cols-2">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-72 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-2xl">⚠️</p>
        <p className="text-sm text-slate-400">Erro ao carregar análises</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">Análise</h1>
      <p className="text-xs text-slate-500">Dados dos últimos 6 meses</p>

      <div className="grid gap-4 xl:grid-cols-2">

        {/* Evolução mensal */}
        <ChartCard title="Evolução de Gastos (6 meses)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={porMes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={fmtTooltip} contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Gastos por categoria — barras */}
        <ChartCard title="Gastos por Categoria">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porCategoria} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={fmtTooltip} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="valor" radius={[6,6,0,0]}>
                {porCategoria.map((_, i) => (
                  <Cell key={i} fill={CARD_COLORS[i % CARD_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Distribuição por categoria — pizza */}
        <ChartCard title="Distribuição por Categoria">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={porCategoria}
                dataKey="valor"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                paddingAngle={3}
              >
                {porCategoria.map((_, i) => (
                  <Cell key={i} fill={CARD_COLORS[i % CARD_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={fmtTooltip} contentStyle={TOOLTIP_STYLE} />
              <Legend
                formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Gastos por cartão */}
        <ChartCard title="Gastos por Cartão">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porCartao} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip formatter={fmtTooltip} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="valor" radius={[0,6,6,0]}>
                {porCartao.map((_, i) => (
                  <Cell key={i} fill={CARD_COLORS[i % CARD_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}