"use client";

import { useState, useEffect } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompradores } from "@/hooks/useCompradores";
import { useCategoriasLista } from "@/hooks/useCategoriasLista";
import { TransacaoFull } from "@/hooks/useTransacoesFull";
import { formatMoeda, parseCurrencyInput } from "@/lib/utils";

type Props = {
  transacao: TransacaoFull | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditarTransacaoDialog({ transacao, onClose, onSuccess }: Props) {
  const { compradores, criarComprador } = useCompradores();
  const { categorias } = useCategoriasLista();

  const [merchantName, setMerchantName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [novoComprador, setNovoComprador] = useState("");
  const [isCriandoComprador, setIsCriandoComprador] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [transactionDate, setTransactionDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Estados para Deleção
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (transacao) {
      setMerchantName(transacao.merchant_name);
      setCategoryId(transacao.category_id || "");
      setBuyerId(transacao.buyer_id || "");
      setAmount(transacao.amount);
      setTransactionDate(transacao.transaction_date || "");
      setNotes(transacao.notes || "");
      setError("");
      setIsCriandoComprador(false);
      setNovoComprador("");
      setIsConfirmingDelete(false);
    }
  }, [transacao]);

  if (!transacao) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      let finalBuyerId = buyerId;

      if (isCriandoComprador && novoComprador.trim() !== "") {
        const comp = await criarComprador(novoComprador.trim());
        if (comp) {
          finalBuyerId = comp.id;
        } else {
          throw new Error("Falha ao criar o comprador.");
        }
      }

      const updates = {
        merchant_name: merchantName,
        category_id: categoryId || null,
        buyer_id: finalBuyerId || null,
        amount,
        transaction_date: transactionDate,
        notes,
      };

      if (!transacao) return;

      const { error: updateError } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", transacao.id);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao atualizar.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!transacao) return;
    setError("");
    setIsDeleting(true);

    try {
      const { error: delError } = await supabase
        .from("transactions")
        .update({ is_deleted: true })
        .eq("id", transacao.id);

      if (delError) throw delError;

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao deletar transação.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={!!transacao} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[#FFFFFF]">Editar Transação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#FFFFFF]">Valor</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-[#FFFFFF]">R$</span>
              <input
                type="text"
                value={formatMoeda(amount).replace("R$", "").trim()}
                onChange={(e) => setAmount(parseCurrencyInput(e.target.value))}
                className="w-full rounded-xl border border-white/[0.08] bg-slate-900 pl-10 pr-3.5 py-2.5 text-sm text-[#FFFFFF] font-semibold tabular-nums focus:border-blue-500/50 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#FFFFFF]">Data da Compra</label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-[#FFFFFF] focus:border-blue-500/50 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Estabelecimento */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#FFFFFF]">Estabelecimento / Descrição</label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-[#FFFFFF] focus:border-blue-500/50 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#FFFFFF]">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-[#FFFFFF] focus:border-blue-500/50 focus:outline-none transition-colors"
            >
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Comprador */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#FFFFFF]">Comprador</label>
            {!isCriandoComprador ? (
              <select
                value={buyerId}
                onChange={(e) => {
                  if (e.target.value === "NEW") {
                    setIsCriandoComprador(true);
                  } else {
                    setBuyerId(e.target.value);
                  }
                }}
                className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-[#FFFFFF] focus:border-blue-500/50 focus:outline-none transition-colors"
              >
                <option value="">Eu (Padrão)</option>
                {compradores.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
                <option value="NEW" className="font-semibold text-blue-400">
                  + Novo Comprador
                </option>
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nome do novo comprador..."
                  value={novoComprador}
                  onChange={(e) => setNovoComprador(e.target.value)}
                  className="flex-1 rounded-xl border border-blue-500/50 bg-slate-900 px-3.5 py-2.5 text-sm text-[#FFFFFF] focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCriandoComprador(false)}
                  className="rounded-xl px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#FFFFFF]">Notas / Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-[#FFFFFF] focus:border-blue-500/50 focus:outline-none transition-colors"
              rows={2}
            />
          </div>

          <div className="pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            
            {/* Bloco de Deleção */}
            <div className="flex items-center gap-2 order-2 sm:order-1">
              {isConfirmingDelete ? (
                <>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sim, apagar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={isDeleting}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
                  >
                    Não
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex items-center justify-center rounded-xl border border-red-500/20 p-2.5 text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Apagar transação"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Ações Normais */}
            <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none rounded-xl px-4 py-3 sm:py-2.5 text-sm font-semibold text-slate-50 hover:bg-white/5 transition-colors"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-none rounded-xl bg-blue-600 px-5 py-3 sm:py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
