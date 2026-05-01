"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, Upload } from "lucide-react";
import { useTransacoesFull } from "@/hooks/useTransacoesFull";
import { useCartoes } from "@/hooks/useCartoes";
import { useCategoriasLista } from "@/hooks/useCategoriasLista";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { UploadFaturaModal } from "@/components/faturas/upload-fatura-modal";
import { EditarTransacaoDialog } from "@/components/transacoes/editar-transacao-dialog";
import { formatMoeda } from "@/lib/utils";
import { TransacaoFull } from "@/hooks/useTransacoesFull";

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
  const [busca, setBusca] = useState("");
  const [cartaoId, setCartaoId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [mes, setMes] = useState(mesAtual());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [transacaoEditando, setTransacaoEditando] = useState<TransacaoFull | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const buscaDebounced = useDebounce(busca);

  const filtros = useMemo(
    () => ({
      busca: buscaDebounced,
      cartao_id: cartaoId,
      categoria_id: categoriaId, // UUID real da tabela categories
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
    setCartaoId("");
    setCategoriaId("");
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

  const totalFiltrado = transacoes.reduce((s, t) => s + t.amount, 0);
  const filtrosAtivos = !!(busca || cartaoId || categoriaId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white">Transações</h1>

        <div className="flex items-center gap-2">
          {filtrosAtivos && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Limpar filtros
            </button>
          )}

          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Enviar PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Busca */}
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar estabelecimento..."
            className="w-full rounded-xl border border-white/[0.08] bg-slate-800 py-2.5 pl-9 pr-3.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Mês */}
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
        />

        {/* Cartão */}
        <select
          value={cartaoId}
          onChange={(e) => setCartaoId(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
        >
          <option value="">Todos os cartões</option>
          {cartoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nickname}
            </option>
          ))}
        </select>

        {/* Categoria — value agora é o UUID (category_id real no banco) */}
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
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
            // Estado vazio
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-3xl">📄</p>
              <p className="text-sm font-medium text-white">
                Nenhuma transação encontrada
              </p>
              <p className="text-xs text-slate-500">
                Envie uma fatura PDF ou ajuste os filtros
              </p>
              <button
                onClick={() => setUploadOpen(true)}
                className="mt-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
              >
                Enviar PDF
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
    </div>
  );
}