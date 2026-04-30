"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { useInvoices, type Invoice, type InvoiceStatus } from "@/hooks/useInvoices";
import { useCartoes } from "@/hooks/useCartoes";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { formatMoeda } from "@/lib/utils";

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; icon: React.ElementType; class: string }> = {
  open:    { label: "Aberta",   icon: Clock,          class: "text-blue-400 bg-blue-400/10"   },
  closed:  { label: "Fechada",  icon: XCircle,        class: "text-slate-400 bg-slate-400/10" },
  paid:    { label: "Paga",     icon: CheckCircle2,   class: "text-green-400 bg-green-400/10" },
  overdue: { label: "Vencida",  icon: AlertTriangle,  class: "text-red-400 bg-red-400/10"     },
};

const GRADIENTS: Record<string, string> = {
  blue:     "from-blue-600 to-blue-800",
  green:    "from-emerald-600 to-emerald-800",
  graphite: "from-slate-500 to-slate-700",
  purple:   "from-violet-600 to-violet-800",
};

function formatMes(refMonth: string) {
  const [ano, mes] = refMonth.split("-");
  return new Date(Number(ano), Number(mes) - 1, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ─── componente de card de fatura ────────────────────────────────────────────

function InvoiceCard({ invoice, onPagar }: { invoice: Invoice; onPagar: (id: string) => void }) {
  const status = STATUS_CONFIG[invoice.status];
  const StatusIcon = status.icon;
  const gradient = GRADIENTS[invoice.card_theme] ?? GRADIENTS.blue;

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4 transition-all hover:border-white/[0.10]">
      <div className="flex items-start justify-between gap-3">
        {/* Chip do cartão */}
        <div className={`flex h-9 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[10px] font-bold text-white ${gradient}`}>
          {invoice.card_brand.toUpperCase().slice(0, 4)}
        </div>

        {/* Badge de status */}
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.class}`}>
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
      </div>

      <div className="mt-3">
        <p className="text-xs text-slate-500">{invoice.card_nickname}</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-white">
          {formatMoeda(invoice.total_amount)}
        </p>
        <p className="mt-0.5 text-xs font-medium capitalize text-slate-400">
          {formatMes(invoice.reference_month)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>Fechamento: <span className="text-slate-400">{formatData(invoice.closing_date)}</span></span>
        <span>Vencimento: <span className={invoice.status === "overdue" ? "text-red-400 font-semibold" : "text-slate-400"}>{formatData(invoice.due_date)}</span></span>
      </div>

      {/* Botão pagar */}
      {(invoice.status === "open" || invoice.status === "overdue" || invoice.status === "closed") && (
        <button
          onClick={() => onPagar(invoice.id)}
          className="mt-3 w-full rounded-xl bg-blue-600/10 py-2 text-xs font-semibold text-blue-400 transition hover:bg-blue-600 hover:text-white"
        >
          Marcar como paga
        </button>
      )}

      {invoice.status === "paid" && invoice.paid_at && (
        <p className="mt-3 text-center text-[10px] text-green-500">
          ✓ Paga em {formatData(invoice.paid_at)}
        </p>
      )}
    </article>
  );
}

// ─── página ───────────────────────────────────────────────────────────────────

export default function FaturasPage() {
  const { invoices, isLoading, isError, marcarComoPaga } = useInvoices();
  const { cartoes } = useCartoes();

  const [cartaoFiltro, setCartaoFiltro] = useState<string>("todos");
  const [mesOffset, setMesOffset]       = useState(0); // 0 = mês atual

  // Mês de referência a exibir
  const mesReferencia = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + mesOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [mesOffset]);

  const mesLabel = useMemo(() => {
    const [ano, mes] = mesReferencia.split("-");
    return new Date(Number(ano), Number(mes) - 1, 1)
      .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [mesReferencia]);

  // Filtros aplicados
  const faturasFiltradas = useMemo(() => {
    return invoices.filter((inv) => {
      const mesOk   = inv.reference_month.startsWith(mesReferencia);
      const cartaoOk = cartaoFiltro === "todos" || inv.card_id === cartaoFiltro;
      return mesOk && cartaoOk;
    });
  }, [invoices, mesReferencia, cartaoFiltro]);

  // KPIs do mês
  const totalMes   = faturasFiltradas.reduce((s, i) => s + i.total_amount, 0);
  const totalPagas = faturasFiltradas.filter((i) => i.status === "paid").reduce((s, i) => s + i.total_amount, 0);
  const totalAberto = totalMes - totalPagas;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white">Faturas</h1>

        {/* Navegação de mês */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMesOffset((v) => v - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:bg-white/[0.05] hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium capitalize text-white">
            {mesLabel}
          </span>
          <button
            onClick={() => setMesOffset((v) => v + 1)}
            disabled={mesOffset >= 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:bg-white/[0.05] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filtro por cartão */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setCartaoFiltro("todos")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${cartaoFiltro === "todos" ? "bg-blue-600 text-white" : "border border-white/[0.08] text-slate-400 hover:text-white"}`}
        >
          Todos
        </button>
        {cartoes.map((c) => (
          <button
            key={c.id}
            onClick={() => setCartaoFiltro(c.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${cartaoFiltro === c.id ? "bg-blue-600 text-white" : "border border-white/[0.08] text-slate-400 hover:text-white"}`}
          >
            {c.nickname}
          </button>
        ))}
      </div>

      {/* KPIs do mês */}
      {!isLoading && faturasFiltradas.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total do mês",  value: formatMoeda(totalMes),    color: "text-white"       },
            { label: "Em aberto",     value: formatMoeda(totalAberto),  color: "text-yellow-400"  },
            { label: "Pago",          value: formatMoeda(totalPagas),   color: "text-green-400"   },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">{kpi.label}</p>
              <p className={`mt-1 text-sm font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-2xl">⚠️</p>
          <p className="text-sm text-slate-400">Erro ao carregar faturas</p>
        </div>
      ) : faturasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-slate-900/80 py-16 text-center">
          <p className="text-3xl">🧾</p>
          <p className="text-sm font-medium text-white">Nenhuma fatura encontrada</p>
          <p className="text-xs text-slate-500">Não há faturas para o período selecionado</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {faturasFiltradas.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              onPagar={marcarComoPaga}
            />
          ))}
        </div>
      )}
    </div>
  );
}