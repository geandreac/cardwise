"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, Upload, Plus } from "lucide-react";
import { useTransacoesFull } from "@/hooks/useTransacoesFull";
import { useCartoes } from "@/hooks/useCartoes";
import { useCategoriasLista } from "@/hooks/useCategoriasLista";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { UploadFaturaModal } from "@/components/faturas/upload-fatura-modal";
import { EditarTransacaoDialog } from "@/components/transacoes/editar-transacao-dialog";
import { NovaTransacaoDialog } from "@/components/transacoes/nova-transacao-dialog";
import { DeleteAllModal } from "@/components/transacoes/delete-all-modal";
import { formatMoeda } from "@/lib/utils";
import { TransacaoFull } from "@/hooks/useTransacoesFull";
import { GlobalMonthPicker } from "@/components/compartilhado/GlobalMonthPicker";
import { ActionsMenu } from "@/components/transacoes/actions-menu";
import { useDate } from "@/context/date-context";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatData(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);

  const hora = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (d.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`;
  if (d.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── hook de debounce ─────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

// ─── página ───────────────────────────────────────────────────────────────────

export default function TransacoesPage() {
  const { referenceMonth: mes, setReferenceMonth: setMes } = useDate();
  const [busca, setBusca] = useState("");
  


  const [cartaoId, setCartaoId] = useState("all_cards");
  const [categoriaId, setCategoriaId] = useState("all_categories");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [novaOpen, setNovaOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [transacaoEditando, setTransacaoEditando] = useState<TransacaoFull | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const buscaDebounced = useDebounce(busca);

  const filtros = useMemo(
    () => ({
      busca: buscaDebounced,
      cartao_id: cartaoId === "all_cards" ? "" : cartaoId,
      categoria_id: categoriaId === "all_categories" ? "" : categoriaId,
      mes,
      refreshKey,
    }),
    [buscaDebounced, cartaoId, categoriaId, mes, refreshKey]
  );

  const { transacoes, isLoading, isError, temMais, carregarMais } =
    useTransacoesFull(filtros);

  const { cartoes } = useCartoes();

  // useCategoriasLista retorna { id, name, emoji } — correto para o filtro
  const { categorias } = useCategoriasLista();

  function limparFiltros() {
    setBusca("");
    setCartaoId("all_cards");
    setCategoriaId("all_categories");
    setMes(mesAtual());
  }

  function handleUploadSuccess() {
    setUploadOpen(false);
    setRefreshKey((v) => v + 1);
  }

  function handleEditSuccess() {
    setTransacaoEditando(null);
    setRefreshKey((v) => v + 1);
  }

  function handleNovaSuccess() {
    setNovaOpen(false);
    setRefreshKey((v) => v + 1);
  }

  function handleDeleteAllSuccess() {
    setDeleteAllOpen(false);
    setRefreshKey((v) => v + 1);
  }

  const totalFiltrado = transacoes.reduce((s, t) => s + t.amount, 0);
  const filtrosAtivos = !!(busca || cartaoId || categoriaId);

  return (
    <div className="space-y-6">
      {/* Linha 1: Título + Navegação + Ações */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">Transações</h1>
          <GlobalMonthPicker />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNovaOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Transação</span>
          </button>

          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-500/20"
          >
            <Upload className="h-4 w-4" />
            <span>Enviar PDF</span>
          </button>

          <ActionsMenu onDeleteAll={() => setDeleteAllOpen(true)} />
        </div>
      </div>
      
      {/* Linha 2: Barra de Busca e Filtros Pills */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Busca (40% width approx) */}
        <div className="relative w-full max-w-[320px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar transação..."
            className="w-full rounded-full border border-white/[0.08] bg-transparent py-2 pl-9 pr-3.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:bg-slate-800/50 focus:outline-none transition-all"
          />
        </div>

        {/* Filtro Cartão */}
        <Select value={cartaoId} onValueChange={setCartaoId}>
          <SelectTrigger className="h-9 rounded-full border-white/[0.08] bg-transparent px-4 text-xs font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors">
            <SelectValue placeholder="Todos os cartões" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="all_cards">Todos os cartões</SelectItem>
            {cartoes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nickname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro Categoria */}
        <Select value={categoriaId} onValueChange={setCategoriaId}>
          <SelectTrigger className="h-9 rounded-full border-white/[0.08] bg-transparent px-4 text-xs font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="all_categories">Todas as categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span>{c.emoji}</span>
                  <span>{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtrosAtivos && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Limpar
          </button>
        )}
      </div>

      {/* Subtotal */}
      {!isLoading && transacoes.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-slate-900/60 px-4 py-2.5">
          <span className="text-xs text-slate-400">
            {transacoes.length} transaç
            {transacoes.length === 1 ? "ão" : "ões"} encontrada
            {transacoes.length === 1 ? "" : "s"}
          </span>
          <span className="text-sm font-bold tabular-nums text-red-400">
            - {formatMoeda(totalFiltrado)}
          </span>
        </div>
      )}

      {/* Lista */}
      {isError ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-2xl">⚠️</p>
          <p className="text-sm text-slate-400">Erro ao carregar transações</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/80 overflow-hidden">
          {isLoading && transacoes.length === 0 ? (
            // Skeleton
            <div className="divide-y divide-white/[0.05]">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32 rounded" />
                    <Skeleton className="h-2.5 w-20 rounded" />
                  </div>
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : transacoes.length === 0 ? (
            // Estado vazio minimalista
            <div className="flex flex-col items-center gap-4 py-24 text-center border-2 border-dashed border-white/[0.03] rounded-3xl">
              <div className="text-4xl opacity-20 grayscale">📄</div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-300">
                  Nenhuma transação encontrada
                </p>
                <p className="text-xs text-slate-500">
                  Envie um PDF ou ajuste os filtros para ver dados.
                </p>
              </div>
              <button
                onClick={() => setUploadOpen(true)}
                className="mt-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-500/20"
              >
                Enviar PDF agora
              </button>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-white/[0.05]" role="list">
                {transacoes.map((tx) => (
                  <li
                    key={tx.id}
                    onClick={() => setTransacaoEditando(tx)}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]"
                  >
                    {/* Emoji categoria */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-base">
                      {tx.category_emoji}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">
                          {tx.merchant_name}
                        </p>
                        {tx.is_recurring && (
                          <span className="shrink-0 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-blue-400">
                            RECORRENTE
                          </span>
                        )}
                        {tx.installment_info && (
                          <span className="shrink-0 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-purple-400">
                            {tx.installment_info}
                          </span>
                        )}
                        {tx.buyer_name !== "Eu" && (
                          <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400 border border-amber-500/20">
                            👤 {tx.buyer_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-slate-500">
                          {formatData(tx.transaction_date)}
                        </p>
                        <span className="text-slate-700">·</span>
                        <p className="text-[11px] text-slate-500">
                          {tx.card_nickname}
                        </p>
                        <span className="text-slate-700">·</span>
                        <p className="text-[11px] text-slate-500">
                          {tx.category_name}
                        </p>
                      </div>
                    </div>

                    {/* Valor */}
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-red-400">
                      - {formatMoeda(tx.amount)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Carregar mais */}
              {temMais && (
                <div className="border-t border-white/[0.05] p-3">
                  <button
                    onClick={carregarMais}
                    disabled={isLoading}
                    className="w-full rounded-xl py-2.5 text-xs font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "Carregando..." : "Carregar mais"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <UploadFaturaModal
        open={uploadOpen}
        cartoes={cartoes}
        onClose={() => setUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      <EditarTransacaoDialog
        transacao={transacaoEditando}
        onClose={() => setTransacaoEditando(null)}
        onSuccess={handleEditSuccess}
      />

      <NovaTransacaoDialog
        open={novaOpen}
        onClose={() => setNovaOpen(false)}
        onSuccess={handleNovaSuccess}
      />

      <DeleteAllModal
        open={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        onSuccess={handleDeleteAllSuccess}
      />
    </div>
  );
}