// src/components/cartoes/delete-modal.tsx
"use client";

import { Trash2 } from "lucide-react";
import type { CardComGasto } from "@/hooks/useCartoes";
// e substituir Props:
type Props = {
  cartao: CardComGasto | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
};

export function DeleteModal({ cartao, onConfirm, onCancel, isDeleting }: Props) {
  if (!cartao) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <Trash2 className="h-5 w-5 text-red-400" />
        </div>

        <h2 className="text-base font-semibold text-white">Excluir cartão</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Tem certeza que deseja excluir o cartão{" "}
          <span className="font-medium text-white">{cartao.nickname}</span>?
          Esta ação não pode ser desfeita.
        </p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.05] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}