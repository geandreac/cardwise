"use client";

import { useState, useEffect } from "react";
import { User, DollarSign, Calendar, Save, CreditCard, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePerfil } from "@/hooks/usePerfil";
import { useCartoes } from "@/hooks/useCartoes";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { formatMoeda } from "@/lib/utils";

const CURRENCIES = [
  { value: "BRL", label: "Real Brasileiro (R$)" },
  { value: "USD", label: "Dólar Americano ($)"  },
  { value: "EUR", label: "Euro (€)"             },
];

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function formatDataCadastro(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

export default function PerfilPage() {
  const { perfil, isLoading, isError, atualizarPerfil } = usePerfil();
  const { cartoes, limite_total, gasto_total }          = useCartoes();

  const [fullName,     setFullName]     = useState("");
  const [currency,     setCurrency]     = useState("BRL");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [isSaving,     setIsSaving]     = useState(false);
  const [isUploading,  setIsUploading]  = useState(false);
  const [savedMsg,     setSavedMsg]     = useState(false);

  useEffect(() => {
    if (perfil) {
      setFullName(perfil.full_name ?? "");
      setCurrency(perfil.currency ?? "BRL");
      setMonthlyLimit(perfil.monthly_limit ? String(perfil.monthly_limit) : "");
    }
  }, [perfil]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await atualizarPerfil({
        full_name:     fullName,
        currency,
        monthly_limit: monthlyLimit ? Number(monthlyLimit) : null,
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !perfil) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${perfil.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload no storage (requer bucket 'avatars' criado no Supabase)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Atualiza tabela profiles
      await atualizarPerfil({ avatar_url: publicUrl });

      // Atualiza metadados do auth do usuário (usado pela Topbar)
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      // Força um recarregamento para a Topbar notar (ou refresh)
      window.location.reload();

    } catch (error: any) {
      console.error("Erro ao subir avatar:", error);
      alert("Falha ao subir a imagem. Verifique se o bucket 'avatars' existe e é público.");
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !perfil) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-2xl">⚠️</p>
        <p className="text-sm text-slate-400">Erro ao carregar perfil</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-white">Perfil</h1>

      {/* Card de identidade */}
      <section className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-5">
        <div className="flex items-center gap-4">
          <div className="relative group flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white select-none">
            {perfil.avatar_url ? (
              <img src={perfil.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              getInitials(perfil.full_name || "U")
            )}

            <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploading} />
            </label>
          </div>
          <div>
            <p className="text-base font-semibold text-white">{perfil.full_name || "Usuário"}</p>
            <p className="text-xs text-slate-500">
              Membro desde {formatDataCadastro(perfil.created_at)}
            </p>
            <span className="mt-1.5 inline-block rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400">
              Plano Premium
            </span>
          </div>
        </div>

        {/* Estatísticas rápidas */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { icon: CreditCard, label: "Cartões",       value: String(cartoes.length)    },
            { icon: DollarSign, label: "Limite total",  value: formatMoeda(limite_total) },
            { icon: DollarSign, label: "Gasto no mês",  value: formatMoeda(gasto_total)  },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-slate-800/50 p-3 text-center">
              <Icon className="mx-auto mb-1 h-4 w-4 text-slate-500" />
              <p className="text-xs font-bold text-white tabular-nums">{value}</p>
              <p className="text-[10px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Formulário de edição */}
      <section className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Dados pessoais</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              Nome completo
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              Moeda padrão
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              Limite mensal de gastos
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="Ex: 3000.00"
              className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-slate-500">
              Você será alertado ao atingir este limite
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </button>

          {savedMsg && (
            <p className="text-center text-xs text-green-400">
              ✓ Perfil atualizado com sucesso!
            </p>
          )}
        </form>
      </section>

      {/* Info da conta */}
      <section className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Informações da conta</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: "ID da conta",     value: perfil.id.slice(0, 8) + "..." },
            { label: "Membro desde",    value: formatDataCadastro(perfil.created_at) },
            { label: "Moeda atual",     value: perfil.currency },
            { label: "Limite mensal",   value: perfil.monthly_limit ? formatMoeda(perfil.monthly_limit) : "Não definido" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-xs text-slate-500">{label}</span>
              <span className="text-xs font-medium text-slate-300">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}