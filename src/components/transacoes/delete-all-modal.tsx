"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface DeleteAllModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteAllModal({ open, onClose, onSuccess }: DeleteAllModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleDelete() {
    try {
      setIsLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("Usuário não autenticado.");
      }

      // Delete all transactions
      const { error: delError } = await supabase
        .from("transactions")
        .delete()
        .not("id", "is", null); 

      if (delError) throw delError;

      // Ensure invoices are also deleted so we don't hit unique constraints on re-import
      const { error: invError } = await supabase
        .from("invoices")
        .delete()
        .not("id", "is", null);

      if (invError) throw invError;

      onSuccess();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao apagar transações. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isLoading ? undefined : onClose} />

      <div className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0f172a] p-6 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 mb-4">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>

        <h2 className="text-center text-lg font-bold text-white mb-2">
          Apagar todas as transações?
        </h2>
        
        <p className="text-center text-sm text-slate-400 mb-6">
          Esta ação é <strong>irreversível</strong>. Todas as transações cadastradas serão apagadas permanentemente. Seus cartões e faturas não serão excluídos, mas ficarão vazios.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-center text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isLoading ? "Apagando..." : "Sim, apagar tudo"}
          </button>
          
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full rounded-xl bg-transparent py-3 text-sm font-medium text-slate-300 hover:bg-white/5 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
