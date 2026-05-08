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
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(2);
  
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
      setIsInstallment(false);
      setInstallmentsCount(2);
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

      if (!transacao) return;

      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", userData.user?.id).single();

      if (isInstallment && installmentsCount > 1) {
        const partialAmount = Math.floor((amount / installmentsCount) * 100) / 100;
        const remainder = Math.round((amount - (partialAmount * installmentsCount)) * 100) / 100;
        
        // Update first installment
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            merchant_name: merchantName,
            category_id: categoryId || null,
            buyer_id: finalBuyerId || null,
            amount: Number((partialAmount + remainder).toFixed(2)),
            transaction_date: transactionDate,
            notes,
            installment_info: `1/${installmentsCount}`
          })
          .eq("id", transacao.id);

        if (updateError) throw updateError;

        // Create remaining installments
        const newTx = [];
        const baseDate = new Date(transacao.competence_date + "T00:00:00");
        for (let i = 2; i <= installmentsCount; i++) {
          const compDate = new Date(baseDate);
          compDate.setMonth(compDate.getMonth() + (i - 1));
          
          newTx.push({
            profile_id: profile?.id,
            card_id: transacao.card_id,
            category_id: categoryId || null,
            buyer_id: finalBuyerId || null,
            merchant_name: merchantName,
            amount: partialAmount,
            transaction_date: transactionDate,
            competence_date: `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, "0")}-01`,
            installment_info: `${i}/${installmentsCount}`,
            notes,
            is_deleted: false,
          });
        }
        
        if (newTx.length > 0) {
          const { error: insertError } = await supabase.from("transactions").insert(newTx);
          if (insertError) throw insertError;
        }
      } else {
        const updates = {
          merchant_name: merchantName,
          category_id: categoryId || null,
          buyer_id: finalBuyerId || null,
          amount,
          transaction_date: transactionDate,
          notes,
        };

        const { error: updateError } = await supabase
          .from("transactions")
          .update(updates)
          .eq("id", transacao.id);

        if (updateError) throw updateError;
      }

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
          <DialogTitle className="text-white">Editar Transação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="editAmount" className="text-sm font-medium text-white">Valor</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-white">R$</span>
              <input
                id="editAmount"
                type="text"
                value={amount === 0 && !transacao ? "" : formatMoeda(amount).replace("R$", "").trim()}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val === "") setAmount(0);
                  else setAmount(parseCurrencyInput(e.target.value));
                }}
                className="w-full rounded-xl border border-white/[0.08] bg-surface pl-10 pr-3.5 py-2.5 text-sm text-white font-semibold tabular-nums focus:border-blue-500/50 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <label htmlFor="editTransactionDate" className="text-sm font-medium text-white">Data da Compra</label>
            <input
              id="editTransactionDate"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-surface px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Estabelecimento */}
          <div className="space-y-1.5">
            <label htmlFor="editMerchantName" className="text-sm font-medium text-white">Estabelecimento / Descrição</label>
            <input
              id="editMerchantName"
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-surface px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <label htmlFor="editCategoryId" className="text-sm font-medium text-white">Categoria</label>
            <select
              id="editCategoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-surface px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
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
            <label htmlFor="editBuyerId" className="text-sm font-medium text-white">Comprador</label>
            {!isCriandoComprador ? (
              <select
                id="editBuyerId"
                value={buyerId}
                onChange={(e) => {
                  if (e.target.value === "NEW") {
                    setIsCriandoComprador(true);
                  } else {
                    setBuyerId(e.target.value);
                  }
                }}
                className="w-full rounded-xl border border-white/[0.08] bg-surface px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
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
                  className="flex-1 rounded-xl border border-blue-500/50 bg-surface px-3.5 py-2.5 text-sm text-white focus:outline-none"
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
            <label htmlFor="editNotes" className="text-sm font-medium text-white">Notas / Observações</label>
            <textarea
              id="editNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-surface px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
              rows={2}
            />
          </div>

          {/* Parcelamento */}
          {!transacao.installment_info && (
            <div className="space-y-3 rounded-xl border border-white/[0.08] bg-elevated/50 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label htmlFor="installment-toggle" className="text-sm font-medium text-white">Transformar em Parcelada?</label>
                  <p className="text-[10px] text-slate-400">Isso irá dividir a compra em faturas futuras.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInstallment(!isInstallment)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isInstallment ? 'bg-blue-600' : 'bg-slate-600'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isInstallment ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
              </div>

              {isInstallment && (
                <div className="space-y-1.5 pt-2">
                  <label htmlFor="editInstallmentsCount" className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Quantidade de Parcelas</label>
                  <input
                    id="editInstallmentsCount"
                    type="number" min={2} max={48}
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(parseInt(e.target.value))}
                    className="w-full rounded-xl border border-white/[0.08] bg-surface px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    O valor total de R$ {amount.toFixed(2)} será dividido em {installmentsCount} parcelas de R$ {(amount / (installmentsCount || 1)).toFixed(2)}.
                  </p>
                </div>
              )}
            </div>
          )}

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
