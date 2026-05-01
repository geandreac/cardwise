"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompradores } from "@/hooks/useCompradores";
import { useCategoriasLista } from "@/hooks/useCategoriasLista";
import { TransacaoFull } from "@/hooks/useTransacoesFull";

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
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (transacao) {
      setMerchantName(transacao.merchant_name);
      setCategoryId(transacao.category_id || "");
      setBuyerId(transacao.buyer_id || "");
      setError("");
      setIsCriandoComprador(false);
      setNovoComprador("");
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

  return (
    <Dialog open={!!transacao} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Estabelecimento */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Estabelecimento</label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
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
            <label className="text-sm font-medium text-slate-300">Comprador</label>
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
                className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
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
                  className="flex-1 rounded-xl border border-blue-500/50 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCriandoComprador(false)}
                  className="rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
