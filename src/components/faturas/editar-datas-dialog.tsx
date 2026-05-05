"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  invoiceId: string;
  currentDueDate: string;
  currentClosingDate: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditarDatasDialog({ invoiceId, currentDueDate, currentClosingDate, open, onClose, onSuccess }: Props) {
  const [dueDate, setDueDate] = useState(currentDueDate);
  const [closingDate, setClosingDate] = useState(currentClosingDate);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSave() {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          due_date: dueDate,
          closing_date: closingDate,
        })
        .eq("id", invoiceId);

      if (error) throw error;
      onSuccess();
    } catch (err) {
      console.error("Erro ao salvar datas:", err);
      alert("Falha ao salvar as novas datas.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Ajustar Ciclo da Fatura</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Data de Fechamento</label>
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
            />
            <p className="text-[10px] text-slate-500">Compras feitas após este dia cairão na próxima fatura.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Data de Vencimento</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
