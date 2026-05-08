"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { useInvoices, type Invoice, type InvoiceStatus } from "@/hooks/useInvoices";
import { useCartoes } from "@/hooks/useCartoes";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { DeleteAllInvoicesModal } from "@/components/faturas/delete-all-invoices-modal";
import { EditarDatasDialog } from "@/components/faturas/editar-datas-dialog";
import { GlobalMonthPicker } from "@/components/compartilhado/GlobalMonthPicker";
import { ActionsMenu } from "@/components/transacoes/actions-menu";
import { formatMoeda } from "@/lib/utils";
import { validateInvoiceTotal } from "@/lib/invoice-utils";
import { useEffect } from "react";
import { useDate } from "@/context/date-context";

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
  if (!iso) return "-";
  // Evitar shift de fuso horário pegando as partes da string diretamente
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ─── componente de card de fatura ────────────────────────────────────────────

function InvoiceCard({ invoice, onPagar, onReverter, onEditDates }: { 
  invoice: Invoice; 
  onPagar: (id: string) => void;
  onReverter: (id: string) => void;
  onEditDates: (inv: Invoice) => void;
}) {
  const status = STATUS_CONFIG[invoice.status];
  const StatusIcon = status.icon;
  const gradient = GRADIENTS[invoice.card_theme] ?? GRADIENTS.blue;

  const [divergence, setDivergence] = useState<{ isDivergent: boolean; computedTotal: number } | null>(null);

  useEffect(() => {
    validateInvoiceTotal(invoice.id).then(setDivergence);
  }, [invoice.id, invoice.total_amount]);

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
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{invoice.card_nickname}</p>
          {divergence?.isDivergent && (
            <div className="group relative">
              <AlertTriangle className="h-4 w-4 text-orange-400 animate-pulse" />
              <div className="absolute right-0 top-6 z-50 hidden w-48 rounded-lg bg-slate-800 p-2 text-[10px] text-slate-300 shadow-xl border border-white/10 group-hover:block">
                O total das compras ({formatMoeda(divergence.computedTotal)}) não bate com o valor da fatura.
              </div>
            </div>
          )}
        </div>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-white">
          {formatMoeda(invoice.total_amount)}
        </p>
        <p className="mt-0.5 text-xs font-medium capitalize text-slate-400">
          {formatMes(invoice.reference_month)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex flex-col gap-0.5">
          <span>Fechamento: <span className="text-slate-400">Dia {invoice.card_closing_day}</span></span>
          <span>Vencimento: <span className={invoice.status === "overdue" ? "text-red-400 font-semibold" : "text-slate-400"}>Dia {invoice.card_due_day}</span></span>
        </div>
        <button 
          onClick={() => onEditDates(invoice)}
          className="text-[10px] text-blue-400 hover:underline"
        >
          Ajustar
        </button>
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
        <div className="mt-3 space-y-2">
          <p className="text-center text-[10px] text-green-500">
            ✓ Paga em {formatData(invoice.paid_at)}
          </p>
          <button
            onClick={() => onReverter(invoice.id)}
            className="w-full rounded-xl bg-slate-800 py-1.5 text-[10px] font-semibold text-slate-400 transition hover:bg-slate-700 hover:text-white"
          >
            Reverter pagamento
          </button>
        </div>
      )}
    </article>
  );
}

// ─── página ───────────────────────────────────────────────────────────────────

export default function FaturasPage() {
  const { invoices, isLoading, isError, marcarComoPaga, reverterPagamento, generateMissingInvoices, generateRollingInvoices } = useInvoices();
  const { cartoes } = useCartoes();
  const { referenceMonth: mesReferencia } = useDate();

  const [cartaoFiltro, setCartaoFiltro] = useState<string>("todos");
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [editDatesInvoice, setEditDatesInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    generateRollingInvoices();
  }, []);

  useEffect(() => {
    if (mesReferencia) {
      generateMissingInvoices(mesReferencia);
    }
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
  const { totalMes, totalPagas, totalAberto } = useMemo(() => {
    const mes = faturasFiltradas.reduce((s, i) => s + i.total_amount, 0);
    const pagas = faturasFiltradas.filter((i) => i.status === "paid").reduce((s, i) => s + i.total_amount, 0);
    return {
      totalMes: mes,
      totalPagas: pagas,
      totalAberto: mes - pagas
    };
  }, [faturasFiltradas]);

  return (
    <div className="space-y-6">
      {/* Header Condensado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Faturas</h1>
          <GlobalMonthPicker />
        </div>

        <ActionsMenu onDeleteAll={() => setDeleteOpen(true)} />
      </div>

      {/* Filtro por cartão (Estilo Pills Minimalista) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setCartaoFiltro("todos")}
          className={`shrink-0 rounded-full px-4 py-2 sm:py-1.5 text-xs font-medium transition-all ${
            cartaoFiltro === "todos" 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
              : "border border-white/[0.08] text-slate-400 hover:bg-slate-800/50 hover:text-white"
          }`}
        >
          Todos
        </button>
        {cartoes.map((c) => (
          <button
            key={c.id}
            onClick={() => setCartaoFiltro(c.id)}
            className={`shrink-0 rounded-full px-4 py-2 sm:py-1.5 text-xs font-medium transition-all ${
              cartaoFiltro === c.id 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                : "border border-white/[0.08] text-slate-400 hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            {c.nickname}
          </button>
        ))}
      </div>

      {/* KPIs do mês */}
      {!isLoading && faturasFiltradas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        // Estado vazio minimalista
        <div className="flex flex-col items-center gap-4 py-24 text-center border-2 border-dashed border-white/[0.03] rounded-3xl">
          <p className="text-4xl opacity-20 grayscale">🧾</p>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-300">Nenhuma fatura encontrada</p>
            <p className="text-xs text-slate-500">Não há registros para o período selecionado.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {faturasFiltradas.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              onPagar={marcarComoPaga}
              onReverter={reverterPagamento}
              onEditDates={setEditDatesInvoice}
            />
          ))}
        </div>
      )}

      <EditarDatasDialog
        open={!!editDatesInvoice}
        invoiceId={editDatesInvoice?.id || ""}
        currentDueDate={editDatesInvoice?.due_date || ""}
        currentClosingDate={editDatesInvoice?.closing_date || ""}
        onClose={() => setEditDatesInvoice(null)}
        onSuccess={() => {
          setEditDatesInvoice(null);
          window.location.reload();
        }}
      />

      <DeleteAllInvoicesModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onSuccess={() => {
          setDeleteOpen(false);
          window.location.reload(); // Recarrega para limpar cache do hook e refetch
        }}
      />
    </div>
  );
}