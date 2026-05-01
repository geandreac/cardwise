"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
import type { CardComGasto } from "@/hooks/useCartoes";

export type FormData = {
  nickname: string;
  last_four: string;
  holder_name: string;
  brand: string;
  credit_limit: string;
  due_day: string;
  closing_day: string;
  due_next_month: boolean;
  theme_color: string;
};

const INITIAL: FormData = {
  nickname: "", last_four: "", holder_name: "",
  brand: "visa", credit_limit: "",
  due_day: "", closing_day: "", due_next_month: true, theme_color: "blue",
};

type Props = {
  open: boolean;
  cartao?: CardComGasto | null;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
  isSaving: boolean;
};

const brands = ["visa","mastercard","elo","amex","hipercard","other"];
const themes = ["blue","green","graphite","purple","lightblue","yellow","black","orange"];
const themeColors: Record<string, string> = {
  blue: "bg-blue-600", green: "bg-emerald-600",
  graphite: "bg-slate-800", purple: "bg-purple-600",
  lightblue: "bg-sky-400", yellow: "bg-yellow-400",
  black: "bg-black", orange: "bg-orange-500"
};

export function CardDrawer({ open, cartao, onClose, onSave, isSaving }: Props) {
  const [form, setForm] = useState<FormData>(INITIAL);

  useEffect(() => {
    if (cartao) {
      setForm({
        nickname:     cartao.nickname,
        last_four:    cartao.last_four,
        holder_name:  cartao.holder_name,
        brand:        cartao.brand,
        credit_limit: String(cartao.credit_limit),
        due_day:      String(cartao.due_day ?? ""),
        closing_day:  String(cartao.closing_day ?? ""),
        due_next_month: cartao.due_next_month ?? true,
        theme_color:  cartao.theme_color,
      });
    } else {
      setForm(INITIAL);
    }
  }, [cartao, open]);

  function set(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/[0.06] bg-slate-900 shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">
            {cartao ? "Editar cartão" : "Novo cartão"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">

          {[
            { field: "nickname",    label: "Apelido",          placeholder: "Ex: Nubank Gold" },
            { field: "holder_name", label: "Nome no cartão",   placeholder: "JOAO A SILVA" },
          ].map(({ field, label, placeholder }) => (
            <div key={field} className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-widest text-slate-400">{label}</label>
              <input
                required
                value={form[field as keyof FormData] as string}
                onChange={(e) => set(field as keyof FormData, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-widest text-slate-400">4 últimos dígitos</label>
              <input
                required maxLength={4}
                value={form.last_four}
                onChange={(e) => set("last_four", e.target.value.replace(/\D/g, ""))}
                placeholder="0000"
                className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none font-mono tracking-widest transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Limite de crédito</label>
              <input
                required type="number" min={1} step="0.01"
                value={form.credit_limit}
                onChange={(e) => set("credit_limit", e.target.value)}
                placeholder="5000.00"
                className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Dia de fechamento</label>
              <input
                required type="number" min={1} max={31}
                value={form.closing_day}
                onChange={(e) => set("closing_day", e.target.value)}
                placeholder="20"
                className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Dia de vencimento</label>
              <input
                required type="number" min={1} max={31}
                value={form.due_day}
                onChange={(e) => set("due_day", e.target.value)}
                placeholder="27"
                className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-slate-800 p-3.5">
            <div className="space-y-0.5">
              <label className="text-[12px] font-medium text-white">Vence no mês seguinte?</label>
              <p className="text-[10px] text-slate-400">Ative se as compras próximas ao fechamento ficam para o próximo mês civil.</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, due_next_month: !f.due_next_month }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${form.due_next_month ? 'bg-blue-600' : 'bg-slate-600'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.due_next_month ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Bandeira</label>
            <select
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
            >
              {brands.map((b) => (
                <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Cor do cartão</label>
            <div className="flex gap-3">
              {themes.map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => set("theme_color", t)}
                  className={`h-8 w-8 rounded-full transition-all ${themeColors[t]} ${form.theme_color === t ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110" : "opacity-60 hover:opacity-100"}`}
                  aria-label={`Cor ${t}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="submit" disabled={isSaving}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isSaving ? "Salvando..." : cartao ? "Salvar alterações" : "Adicionar cartão"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}