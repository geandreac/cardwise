import { supabase } from "./supabase";

/**
 * Calcula o mês de referência (Mês de Vencimento) para uma transação.
 * Baseado no dia de fechamento e se o vencimento é no mês seguinte.
 */
export async function findInvoiceByDate(cardId: string, transactionDate: string): Promise<{ reference_month: string; invoice_id?: string }> {
  // 1. Buscar faturas existentes para checar datas personalizadas (overrides)
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("card_id", cardId)
    .order("closing_date", { ascending: true });

  const date = new Date(transactionDate);

  if (invoices && invoices.length > 0) {
    for (let i = 0; i < invoices.length; i++) {
      const current = invoices[i];
      const prev = i > 0 ? invoices[i - 1] : null;

      const currentDate = new Date(current.closing_date);
      // Para o ciclo inicial, consideramos qualquer data anterior ao primeiro fechamento
      const prevDate = prev ? new Date(prev.closing_date) : null;

      // Se a compra caiu neste ciclo (após o fechamento anterior e antes/no fechamento atual)
      if (date <= currentDate && (!prevDate || date > prevDate)) {
        return { reference_month: current.reference_month, invoice_id: current.id };
      }
    }
  }

  // 2. Fallback para Lógica Padrão do Cartão
  const { data: card } = await supabase.from("cards").select("*").eq("id", cardId).single();
  if (!card) throw new Error("Cartão não encontrado");

  // Usar UTC para evitar problemas de fuso horário em datas puras (AAAA-MM-DD)
  const tDate = new Date(transactionDate + "T12:00:00Z"); 
  const tDay = tDate.getUTCDate();
  const tMonth = tDate.getUTCMonth();
  const tYear = tDate.getUTCFullYear();

  // Mês da Fatura (quando ela fecha)
  let invoiceMonth = tMonth;
  const invoiceYear = tYear;

  if (tDay > card.closing_day) {
    invoiceMonth += 1;
  }

  // Mês de Referência (Vencimento)
  // Usamos a distância gravada para projetar o vencimento
  let refMonth = invoiceMonth;
  let refYear = invoiceYear;

  // Se a distância for muito grande ou o card for due_next_month, avançamos o mês de referência
  if (card.due_next_month) {
    refMonth += 1;
  }

  if (refMonth > 11) {
    refYear += Math.floor(refMonth / 12);
    refMonth = refMonth % 12;
  }

  // --- DATA DE VENCIMENTO BRUTA ---
  // Mantemos o dia fixo conforme solicitado (sem arredondamentos para dia útil)
  const referenceMonthStr = `${refYear}-${String(refMonth + 1).padStart(2, "0")}-01`;
  
  // Tentar achar uma fatura que já exista para essa referência calculada
  const existing = invoices?.find(inv => inv.reference_month === referenceMonthStr);

  return { reference_month: referenceMonthStr, invoice_id: existing?.id };
}

/**
 * Valida se a soma das transações de uma fatura bate com o total informado.
 */
export async function validateInvoiceTotal(invoiceId: string): Promise<{ isDivergent: boolean; computedTotal: number; reportedTotal: number }> {
    const { data: invoice } = await supabase.from("invoices").select("total_amount").eq("id", invoiceId).single();
    const { data: transactions } = await supabase.from("transactions").select("amount").eq("invoice_id", invoiceId);
    
    if (!invoice) return { isDivergent: false, computedTotal: 0, reportedTotal: 0 };
    
    const computedTotal = (transactions || []).reduce((acc, t) => acc + (t.amount || 0), 0);
    const reportedTotal = invoice.total_amount || 0;
    
    // Tolerância de 1 centavo para erros de arredondamento
    const isDivergent = Math.abs(computedTotal - reportedTotal) > 0.01;
    
    return { isDivergent, computedTotal, reportedTotal };
}

/**
 * Retorna quantos dias tem um mês específico.
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Soma meses a uma data usando aritmética pura (sem Date objects).
 * Aplica clamp no dia para meses curtos (ex: 31/Jan + 1 = 28/Fev).
 */
function addMonthsPure(y: number, m: number, d: number, monthsToAdd: number): { year: number; month: number; day: number } {
  let newMonth = m + monthsToAdd;
  let newYear = y;
  while (newMonth > 12) { newMonth -= 12; newYear += 1; }
  while (newMonth < 1)  { newMonth += 12; newYear -= 1; }
  const maxDay = getDaysInMonth(newYear, newMonth);
  const newDay = Math.min(d, maxDay);
  return { year: newYear, month: newMonth, day: newDay };
}

/**
 * Formata {year, month, day} em string "YYYY-MM-DD".
 */
function formatDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Gera uma série de transações para compras parceladas.
 *
 * ARQUITETURA "BIG BANG DA COMPRA" (Aritmética Pura):
 * - A data extraída do PDF é SEMPRE a Data Âncora (Parcela 1/Y).
 * - O ano é inferido comparando o mês da compra com o mês da fatura.
 * - Cada parcela recebe sua data cronológica real via soma de meses inteiros.
 * - O Smart Cycle é aplicado sobre a data projetada de cada parcela.
 * - ZERO uso de Date objects para cálculos de data.
 */
export function generateInstallmentSeries(
  baseTransaction: any,
  currentInstallment: number,
  totalInstallments: number,
  card: any,
  invoiceReferenceMonth: string,
) {
  const series = [];
  const groupId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padStart(12, '0');

  // ── PASSO 1: Extrair dia e mês da data impressa no PDF ──
  // REGRA ABSOLUTA: A data impressa É a Data Âncora (Parcela 1/Y). Zero subtração.
  const dateObj = parseDateSafely(baseTransaction.transaction_date);
  if (!dateObj) throw new Error(`Data de transação inválida: ${baseTransaction.transaction_date}`);

  const anchorDay = dateObj.day;
  const anchorMonth = dateObj.month;

  // ── PASSO 2: Inferir o ANO da Data Âncora ──
  const invParts = invoiceReferenceMonth.split('-').map(Number);
  const invoiceYear = invParts[0];
  const invoiceMonth = invParts[1];

  let anchorYear = invoiceYear;
  if (anchorMonth > invoiceMonth) {
    anchorYear = invoiceYear - 1;
  }

  // ── PASSO 3: Projetar cada parcela com aritmética ADITIVA ──
  // Fórmula: Data_da_Parcela(i) = Data_Âncora + (i - 1) meses
  for (let i = 1; i <= totalInstallments; i++) {
    const projected = addMonthsPure(anchorYear, anchorMonth, anchorDay, i - 1);
    const txDateStr = formatDateStr(projected.year, projected.month, projected.day);
    const competenceStr = calculateCompetenceDate(card, txDateStr);

    series.push({
      ...baseTransaction,
      transaction_date: txDateStr,
      competence_date: competenceStr,
      installment_info: `${i}/${totalInstallments}`,
      installment_group_id: groupId,
      is_projection: i !== currentInstallment,
    });
  }

  return series;
}

/**
 * Gera uma assinatura única para a transação para evitar duplicatas.
 */
export function calculateFingerprint(transaction: { transaction_date: string; amount: number; merchant_name: string }) {
  const parts = [
    transaction.transaction_date,
    transaction.amount.toFixed(2),
    transaction.merchant_name.trim().toUpperCase()
  ];
  return parts.join("|");
}

/**
 * Versão síncrona/pura para cálculo de competência em loops.
 */
export function calculateCompetenceDate(card: any, transactionDate: string) {
  const dateObj = parseDateSafely(transactionDate);
  
  if (!dateObj) {
    console.error(`[InvoiceUtils] Falha ao parsear data: ${transactionDate}`);
    return "0000-00-01"; // Fallback seguro para evitar crash, mas visível como erro
  }

  const { day, month, year } = dateObj;

  let targetMonth = month;
  let targetYear = year;

  // REGRA DE OURO (GATILHO DE FECHAMENTO):
  // Se Dia do Lançamento <= Dia de Fechamento -> Fatura M+1
  // Se Dia do Lançamento > Dia de Fechamento  -> Fatura M+2
  if (day <= card.closing_day) {
    targetMonth += 1;
  } else {
    targetMonth += 2;
  }

  if (targetMonth > 12) {
    targetYear += Math.floor((targetMonth - 1) / 12);
    targetMonth = ((targetMonth - 1) % 12) + 1;
  }

  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
}

/**
 * Utilitário para parsear datas em diversos formatos (YYYY-MM-DD ou DD/MM/YYYY)
 */
function parseDateSafely(dateStr: string): { day: number; month: number; year: number } | null {
  if (!dateStr) return null;

  // Formato ISO: YYYY-MM-DD
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-").map(p => parseInt(p, 10));
    if (parts.length >= 3 && !parts.some(isNaN)) {
      // Checar se o primeiro é o ano (4 dígitos)
      if (parts[0] > 1900) return { year: parts[0], month: parts[1], day: parts[2] };
      // Caso contrário, pode ser DD-MM-YYYY
      return { day: parts[0], month: parts[1], year: parts[2] };
    }
  }

  // Formato Brasileiro: DD/MM/YYYY
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/").map(p => parseInt(p, 10));
    if (parts.length >= 3 && !parts.some(isNaN)) {
      // DD/MM/YYYY
      if (parts[2] > 1900) return { day: parts[0], month: parts[1], year: parts[2] };
      // YYYY/MM/DD
      if (parts[0] > 1900) return { year: parts[0], month: parts[1], day: parts[2] };
    }
  }

  // Tentar via Date object como último recurso
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear()
    };
  }

  return null;
}
