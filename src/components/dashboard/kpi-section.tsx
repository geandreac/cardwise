// src/components/dashboard/kpi-section.tsx
"use client";

import { Wallet, ShieldCheck, Calendar, AlertTriangle } from "lucide-react";
import { KpiCard }    from "@/components/dashboard/kpi-card";
import { ProgressCard } from "@/components/dashboard/progress-card";
import { Skeleton }   from "@/components/compartilhado/Skeleton";
import { useCartoes } from "@/hooks/useCartoes";
import { formatMoeda } from "@/lib/utils";

export function KpiSection() {
  const { cartoes, isLoading } = useCartoes();

  // ── agregados ──────────────────────────────────────────────────────────────
  const gastoTotal     = cartoes.reduce((s, c) => s + c.current_spend, 0);
  const limiteTotal    = cartoes.reduce((s, c) => s + c.credit_limit,  0);
  const limiteDisp     = limiteTotal - gastoTotal;
  const usagePercent   = limiteTotal > 0
    ? Math.round((gastoTotal / limiteTotal) * 100)
    : 0;

  // cartão com vencimento mais próximo
  const proximoVenc = cartoes.reduce<{ apelido: string; valor: number; dia: number } | null>(
    (acc, c) => {
      if (!c.due_day) return acc;
      if (!acc || c.due_day < acc.dia) {
        return { apelido: c.nickname, valor: c.current_spend, dia: c.due_day };
      }
      return acc;
    },
    null
  );

  // alertas = cartões com uso acima de 80 %
  const alertasCriticos = cartoes.filter((c) => c.usage_percent >= 80).length;

  // ── loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[100px] w-full rounded-2xl" />
          ))}
        </section>
        <Skeleton className="h-[72px] w-full rounded-2xl" />
      </>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <section
        aria-label="Resumo financeiro"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <KpiCard
          title="Gasto do Mês"
          value={formatMoeda(gastoTotal)}
          hint={limiteTotal > 0 ? `${usagePercent}% do limite total` : "Sem limite cadastrado"}
          hintVariant={usagePercent >= 80 ? "red" : usagePercent >= 60 ? "yellow" : "muted"}
          icon={<Wallet className="h-4 w-4 text-blue-400" />}
        />

        <KpiCard
          title="Limite Disponível"
          value={formatMoeda(limiteDisp)}
          hint={`${100 - usagePercent}% disponível`}
          hintVariant={limiteDisp <= 0 ? "red" : "green"}
          icon={<ShieldCheck className="h-4 w-4 text-green-400" />}
        />

        <KpiCard
          title="Próxima Fatura"
          value={proximoVenc ? formatMoeda(proximoVenc.valor) : "—"}
          hint={
            proximoVenc
              ? `Dia ${proximoVenc.dia} — ${proximoVenc.apelido}`
              : "Nenhum vencimento"
          }
          hintVariant="yellow"
          icon={<Calendar className="h-4 w-4 text-yellow-400" />}
        />

        <KpiCard
          title="Alertas Ativos"
          value={String(alertasCriticos)}
          hint={
            alertasCriticos === 0
              ? "Tudo sob controle"
              : `${alertasCriticos} cartão${alertasCriticos > 1 ? "s" : ""} acima de 80%`
          }
          hintVariant={alertasCriticos > 0 ? "red" : "green"}
          icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
        />
      </section>

      <ProgressCard
        used={gastoTotal}
        total={limiteTotal}
        percent={usagePercent}
      />
    </>
  );
}