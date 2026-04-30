// src/app/dashboard/cartoes/page.tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useCartoes, type CardComGasto } from "@/hooks/useCartoes";
import { CardVisual }  from "@/components/cartoes/card-visual";
import { CardDrawer, type FormData } from "@/components/cartoes/card-drawer";
import { DeleteModal } from "@/components/cartoes/delete-modal";
import { Skeleton }    from "@/components/compartilhado/Skeleton";
import type { CardBrand, CardTheme } from "@/types";

export default function CartoesPage() {
  const { cartoes, isLoading, criarCartao, atualizarCartao, desativarCartao } = useCartoes();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editando,   setEditando]   = useState<CardComGasto | null>(null);
  const [deletando,  setDeletando]  = useState<CardComGasto | null>(null);
  const [isSaving,   setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSave(data: FormData) {
    setIsSaving(true);
    try {
      if (editando) {
        await atualizarCartao(editando.id, {
          nickname:     data.nickname,
          credit_limit: Number(data.credit_limit),
          theme_color:  data.theme_color as CardTheme,
        });
      } else {
        await criarCartao({
          nickname:     data.nickname,
          holder_name:  data.holder_name,
          last_four:    data.last_four,
          brand:        data.brand as CardBrand,
          credit_limit: Number(data.credit_limit),
          due_day:      Number(data.due_day),
          closing_day:  Number(data.closing_day),
          theme_color:  data.theme_color as CardTheme,
        });
      }
      setDrawerOpen(false);
      setEditando(null);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletando) return;
    setIsDeleting(true);
    try {
      await desativarCartao(deletando.id);
      setDeletando(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Meus Cartões</h1>
        <button
          onClick={() => { setEditando(null); setDrawerOpen(true); }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo cartão
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : cartoes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-slate-900/80 py-16 text-center">
          <p className="text-4xl">💳</p>
          <p className="text-sm font-medium text-white">Nenhum cartão cadastrado</p>
          <p className="text-xs text-slate-500">Adicione seu primeiro cartão para começar</p>
          <button
            onClick={() => { setEditando(null); setDrawerOpen(true); }}
            className="mt-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Adicionar cartão
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cartoes.map((cartao) => (
            <CardVisual
              key={cartao.id}
              cartao={cartao}
              onEdit={(c) => { setEditando(c); setDrawerOpen(true); }}
              onDelete={setDeletando}
            />
          ))}
        </div>
      )}

      <CardDrawer
        open={drawerOpen}
        cartao={editando}
        onClose={() => { setDrawerOpen(false); setEditando(null); }}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <DeleteModal
        cartao={deletando}
        onConfirm={handleDelete}
        onCancel={() => setDeletando(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}