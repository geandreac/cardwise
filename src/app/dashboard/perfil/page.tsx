"use client";

import { useState, useEffect } from "react";
import { User, DollarSign, Calendar, Save, CreditCard, Download, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePerfil } from "@/hooks/usePerfil";
import { useCartoes } from "@/hooks/useCartoes";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import { formatMoeda, cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  const { perfil, isLoading, isError, atualizarPerfil, deletarConta } = usePerfil();
  const { cartoes, limite_total, gasto_total }          = useCartoes();

  const [fullName,     setFullName]     = useState("");
  const [currency,     setCurrency]     = useState("BRL");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [isSaving,     setIsSaving]     = useState(false);
  const [savedMsg,     setSavedMsg]     = useState(false);
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [shouldShake, setShouldShake] = useState(false);

  const EXPECTED_TEXT = "DELETAR MINHA CONTA";
  const isConfirmValid = confirmText === EXPECTED_TEXT;

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



  async function handleExportData() {
    try {
      const { data: cards } = await supabase.from("cards").select("*");
      const { data: transactions } = await supabase.from("transactions").select("*");
      const { data: invoices } = await supabase.from("invoices").select("*");

      const exportData = {
        perfil,
        cartoes: cards || [],
        transacoes: transactions || [],
        faturas: invoices || [],
        exportado_em: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cardwise_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erro ao exportar dados:", e);
      alert("Falha ao exportar dados.");
    }
  }

  async function handleDeleteAccount() {
    if (!isConfirmValid) {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
      return;
    }

    setIsDeleting(true);
    try {
      await deletarConta();
    } catch (e) {
      console.error(e);
      alert("Falha ao tentar apagar a conta.");
      setIsDeleting(false);
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
      <section className="rounded-2xl border border-white/[0.06] bg-surface/80 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white select-none shadow-inner">
            {getInitials(perfil.full_name || "U")}
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
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: CreditCard, label: "Cartões",       value: String(cartoes.length)    },
            { icon: DollarSign, label: "Limite total",  value: formatMoeda(limite_total) },
            { icon: DollarSign, label: "Gasto no mês",  value: formatMoeda(gasto_total)  },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-elevated/50 p-3 text-center">
              <Icon className="mx-auto mb-1 h-4 w-4 text-slate-500" />
              <p className="text-xs font-bold text-white tabular-nums">{value}</p>
              <p className="text-[10px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Formulário de edição */}
      <section className="rounded-2xl border border-white/[0.06] bg-surface/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Dados pessoais</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="perfil_nome" className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              Nome completo
            </label>
            <input
              id="perfil_nome"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-xl border border-white/[0.08] bg-elevated px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="perfil_moeda" className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              Moeda padrão
            </label>
            <select
              id="perfil_moeda"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-elevated px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="perfil_limite" className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              Limite mensal de gastos
            </label>
            <input
              id="perfil_limite"
              type="number"
              min={0}
              step="0.01"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="Ex: 3000.00"
              className="w-full rounded-xl border border-white/[0.08] bg-elevated px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors"
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
      <section className="rounded-2xl border border-white/[0.06] bg-surface/80 p-5">
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

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-slate-800/50 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar meus dados (JSON)
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-2xl border border-red-500/20 bg-red-950/10 p-5 mt-8">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold text-red-400">Zona de Perigo</h2>
        </div>
        
        <div className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Ao apagar sua conta, você perderá acesso ao CardWise e todos os seus dados serão removidos permanentemente dos nossos servidores. 
            Esta ação não pode ser desfeita. Recomendamos exportar seus dados antes de prosseguir.
          </p>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-red-500/10 border border-red-500/20 px-6 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white transition-all"
          >
            <Trash2 className="h-4 w-4" />
            Apagar Minha Conta
          </button>
        </div>
      </section>

      {/* Modal de Confirmação Estilo GitHub */}
      <Dialog open={showDeleteModal} onOpenChange={(v) => { if(!isDeleting) setShowDeleteModal(v); if(!v) setConfirmText(""); }}>
        <DialogContent className="sm:max-w-[420px] border-red-500/20 bg-slate-900/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
          <div className={cn(
            "w-full h-full",
            shouldShake && "animate-shake"
          )}>
            <DialogHeader className="p-6 border-b border-white/5 bg-red-500/5">
              <div className="flex items-center gap-3 text-red-400 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <DialogTitle>Apagar Conta Permanentemente</DialogTitle>
              </div>
              <DialogDescription className="text-slate-400 text-xs leading-relaxed">
                Esta ação é <strong>irreversível</strong>. Todos os seus dados, incluindo cartões, faturas e transações, serão removidos para sempre.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] text-slate-300 font-medium">
                  Para confirmar, digite a frase abaixo no campo:
                </p>
                <div className="bg-slate-950/50 border border-white/5 rounded-lg p-2.5 text-center select-none">
                  <code className="text-xs font-mono text-red-400 font-bold">{EXPECTED_TEXT}</code>
                </div>
                <input
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Digite a frase de confirmação"
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none",
                    isConfirmValid 
                      ? "border-green-500/50 bg-green-500/5 text-white" 
                      : "border-white/10 bg-slate-800 text-slate-300 focus:border-red-500/50"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isConfirmValid) handleDeleteAccount();
                    else if (e.key === "Enter" && !isConfirmValid) {
                      setShouldShake(true);
                      setTimeout(() => setShouldShake(false), 500);
                    }
                  }}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl py-3 text-xs font-semibold text-slate-400 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={!isConfirmValid || isDeleting}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold text-white transition-all shadow-lg",
                    isConfirmValid 
                      ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" 
                      : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 shadow-none"
                  )}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Apagando...
                    </>
                  ) : (
                    "Confirmar Exclusão"
                  )}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}