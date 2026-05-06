"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompradores } from "@/hooks/useCompradores";
import { useCategoriasLista } from "@/hooks/useCategoriasLista";
import { useCartoes } from "@/hooks/useCartoes";
import { formatMoeda, parseCurrencyInput } from "@/lib/utils";
import { findInvoiceByDate, calculateCompetenceDate } from "@/lib/invoice-utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

// ── Pure date math (espelho do invoice-utils.ts) ──
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function addMonthsPure(y: number, m: number, d: number, monthsToAdd: number) {
  let newMonth = m + monthsToAdd;
  let newYear = y;
  while (newMonth > 12) { newMonth -= 12; newYear += 1; }
  while (newMonth < 1)  { newMonth += 12; newYear -= 1; }
  const maxDay = getDaysInMonth(newYear, newMonth);
  return { year: newYear, month: newMonth, day: Math.min(d, maxDay) };
}

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function NovaTransacaoDialog({ open, onClose, onSuccess }: Props) {
  const { compradores, criarComprador } = useCompradores();
  const { categorias } = useCategoriasLista();
  const { cartoes } = useCartoes();

  const [cardId, setCardId] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [novoComprador, setNovoComprador] = useState("");
  const [isCriandoComprador, setIsCriandoComprador] = useState(false);
  const [amount, setAmount] = useState<number | "">("");
  const [transactionDate, setTransactionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [totalParcelas, setTotalParcelas] = useState(1);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const valorParcela = amount && totalParcelas > 0 ? Number(amount) / totalParcelas : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!cardId) throw new Error("Selecione um cartão.");
      if (!amount || amount <= 0) throw new Error("Valor inválido.");
      if (!transactionDate) throw new Error("Data inválida.");
      if (!merchantName) throw new Error("Estabelecimento é obrigatório.");

      let finalBuyerId = buyerId;
      if (isCriandoComprador && novoComprador.trim() !== "") {
        const comp = await criarComprador(novoComprador.trim());
        if (comp) {
          finalBuyerId = comp.id;
        } else {
          throw new Error("Falha ao criar o comprador.");
        }
      }

      // Dados do cartão para Smart Cycle
      const { data: cardData } = await supabase
        .from("cards")
        .select("closing_day, due_day, due_next_month")
        .eq("id", cardId)
        .single();

      const closingDay = cardData?.closing_day ?? 20;
      const dueDay = cardData?.due_day ?? 10;

      // Parse da data
      const [year, month, day] = transactionDate.split("-").map(Number);

      if (totalParcelas <= 1) {
        // ── Compra à vista ──
        const { reference_month, invoice_id: existingInvoiceId } = await findInvoiceByDate(cardId, transactionDate);
        let invoiceId = existingInvoiceId;

        if (!invoiceId) {
          const { data: invByRef } = await supabase
            .from("invoices").select("id")
            .eq("card_id", cardId).eq("reference_month", reference_month)
            .maybeSingle();
          invoiceId = invByRef?.id;
        }

        if (!invoiceId) {
          const [refYear, refMonth] = reference_month.split("-").map(Number);
          const { data: newInv, error: invErr } = await supabase
            .from("invoices").insert({
              card_id: cardId,
              reference_month: reference_month,
              due_date: fmtDate(refYear, refMonth, dueDay),
              closing_date: null,
              total_amount: 0,
              status: "open",
            }).select("id").single();
          if (invErr) throw new Error("Erro ao criar fatura: " + invErr.message);
          invoiceId = newInv.id;
        }

        const { error: insertError } = await supabase.from("transactions").insert({
          invoice_id: invoiceId,
          card_id: cardId,
          merchant_name: merchantName,
          category_id: categoryId || null,
          buyer_id: finalBuyerId || null,
          amount: Number(amount),
          transaction_date: transactionDate,
          competence_date: reference_month,
          notes,
          is_recurring: false,
        });
        if (insertError) throw insertError;
      } else {
        // ── Compra parcelada ──
        // Gerar série completa com Big Bang: data informada = Parcela 1
        const installmentGroupId = crypto.randomUUID();
        const perInstallmentAmount = Math.round((Number(amount) / totalParcelas) * 100) / 100;

        // Coletar todos os meses de competência para findOrCreate de faturas
        const allCompetenceMonths = new Set<string>();
        const installments = [];

        for (let i = 1; i <= totalParcelas; i++) {
          const proj = addMonthsPure(year, month, day, i - 1);
          const txDate = fmtDate(proj.year, proj.month, proj.day);
          const competence = calculateCompetenceDate({ closing_day: closingDay }, txDate);
          allCompetenceMonths.add(competence);
          installments.push({ txDate, competence, index: i });
        }

        // Buscar faturas existentes
        const { data: existingInvoices } = await supabase
          .from("invoices").select("id, reference_month")
          .eq("card_id", cardId)
          .in("reference_month", Array.from(allCompetenceMonths));

        const invoiceMap = new Map<string, string>();
        existingInvoices?.forEach(inv => invoiceMap.set(inv.reference_month, inv.id));

        // Criar faturas faltantes
        for (const cm of allCompetenceMonths) {
          if (!invoiceMap.has(cm)) {
            const [fYear, fMonth] = cm.split('-').map(Number);
            const { data: newInv, error: invErr } = await supabase
              .from("invoices").insert({
                card_id: cardId,
                reference_month: cm,
                due_date: fmtDate(fYear, fMonth, dueDay),
                closing_date: null,
                total_amount: 0,
                status: "projected",
              }).select("id").single();

            if (!invErr && newInv) {
              invoiceMap.set(cm, newInv.id);
            }
          }
        }

        // Inserir todas as parcelas
        const transactionsToInsert = installments.map(inst => ({
          invoice_id: invoiceMap.get(inst.competence) || null,
          card_id: cardId,
          merchant_name: merchantName,
          category_id: categoryId || null,
          buyer_id: finalBuyerId || null,
          amount: perInstallmentAmount,
          transaction_date: inst.txDate,
          competence_date: inst.competence,
          installment_info: `${inst.index}/${totalParcelas}`,
          installment_group_id: installmentGroupId,
          is_projection: inst.index > 1,
          notes: inst.index === 1 ? notes : "",
          is_recurring: false,
          is_deleted: false,
        }));

        const { error: insertError } = await supabase.from("transactions").insert(transactionsToInsert);
        if (insertError) throw insertError;
      }

      // Limpar formulário
      setCardId("");
      setMerchantName("");
      setCategoryId("");
      setBuyerId("");
      setNovoComprador("");
      setIsCriandoComprador(false);
      setAmount("");
      setTransactionDate("");
      setNotes("");
      setTotalParcelas(1);

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao salvar.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nova Transação Manual</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Cartão */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-50">Cartão</label>
            <select
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
              required
            >
              <option value="">Selecione um cartão</option>
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nickname} (Final {c.last_four})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Valor */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-50">Valor Total</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">R$</span>
                <input
                  type="text"
                  value={amount === "" ? "" : formatMoeda(amount as number).replace("R$", "").trim()}
                  onChange={(e) => setAmount(parseCurrencyInput(e.target.value))}
                  className="w-full rounded-xl border border-white/[0.08] bg-slate-900 pl-10 pr-3.5 py-3 sm:py-2.5 text-sm text-white font-semibold tabular-nums focus:border-blue-500/50 focus:outline-none transition-colors"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            {/* Data */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-50">Data</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-3 sm:py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          {/* Estabelecimento */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-50">Estabelecimento / Descrição</label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
              placeholder="Ex: Mercado Livre"
              required
            />
          </div>

          {/* Parcelamento */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-50">Parcelamento?</label>
            <div className="flex items-center gap-3">
              <select
                value={totalParcelas}
                onChange={(e) => setTotalParcelas(Number(e.target.value))}
                className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
              >
                <option value={1}>À vista (1x)</option>
                {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </div>
            {totalParcelas > 1 && amount && Number(amount) > 0 && (
              <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2 mt-1.5">
                <p className="text-xs text-purple-300">
                  💳 {totalParcelas}x de <span className="font-bold">{formatMoeda(valorParcela)}</span> — serão criadas {totalParcelas} transações projetadas automaticamente
                </p>
              </div>
            )}
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-50">Categoria</label>
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
            <label className="text-sm font-medium text-slate-50">Comprador</label>
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
                  className="rounded-xl px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-50">Notas / Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
              rows={2}
              placeholder="Opcional"
            />
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-3 sm:py-2.5 text-sm font-semibold text-slate-50 hover:bg-white/5 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-blue-600 px-5 py-3 sm:py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Salvando..." : totalParcelas > 1 ? `Adicionar ${totalParcelas}x Parcelas` : "Adicionar Transação"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
