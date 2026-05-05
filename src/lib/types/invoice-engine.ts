/**
 * CardWise — Invoice Engine Types
 * Contrato de dados entre a camada de extração (IA) e o motor de processamento.
 */

// ─────────────────────────────────────────────
// CAMADA 1: Saída Bruta da IA (OCR Layer)
// ─────────────────────────────────────────────

/**
 * Uma transação EXATAMENTE como a IA a leu no PDF.
 * Nenhum campo deve ser inferido ou calculado aqui.
 */
export interface RawExtractedTransaction {
  /** Data impressa na linha do PDF. Formato YYYY-MM-DD. Ex: "2025-12-19" */
  date: string;
  /** Nome do estabelecimento exato, sem modificações. */
  description: string;
  /** Valor positivo da parcela nesta fatura. */
  amount: number;
  /**
   * Fração EXATA extraída do texto (ex: "5/5", "2/2").
   * null se a compra não é parcelada.
   * NUNCA deve ser inferida ou inventada pela IA.
   */
  installment_info: string | null;
}

/**
 * Saída completa da IA após leitura do PDF.
 * reference_month não precisa vir da IA — é injetado pelo sistema via card config.
 */
export interface RawInvoiceExtraction {
  bank: string;
  /** Data de vencimento desta fatura. Formato YYYY-MM-DD. */
  due_date: string;
  /** Data de fechamento/corte desta fatura. Formato YYYY-MM-DD. */
  closing_date: string;
  /** Total a pagar (apenas débitos, sem pagamentos/créditos). */
  total_amount: number;
  /**
   * Mês de referência da fatura. Formato YYYY-MM-01.
   * Pode ser extraído pela IA ou injetado pelo sistema.
   */
  reference_month: string;
  transactions: RawExtractedTransaction[];
}

// ─────────────────────────────────────────────
// CAMADA 2: Configuração do Cartão (Card Config)
// ─────────────────────────────────────────────

/**
 * Configuração de ciclo do cartão, vinda do banco de dados ("Meus Cartões").
 * Estes valores são a fonte da verdade para o Smart Cycle.
 * A IA NUNCA deve deduzir esses valores — eles são injetados pelo sistema.
 */
export interface CardCycleConfig {
  card_id: string;
  /** Dia do mês em que a fatura fecha. Ex: 30 para o Banco do Brasil. */
  closing_day: number;
  /** Dia do mês em que a fatura vence. Ex: 13 para o Banco do Brasil. */
  due_day: number;
}

// ─────────────────────────────────────────────
// CAMADA 3: Transação Processada (Big Bang Output)
// ─────────────────────────────────────────────

/**
 * Uma parcela após ser processada pelo motor "Big Bang da Compra".
 * Cada item desta lista representa um lançamento único na Timeline Global.
 */
export interface ProcessedInstallment {
  card_id: string;
  merchant_name: string;
  amount: number;

  /**
   * DATA CRONOLÓGICA REAL da ocorrência desta parcela.
   * Calculada como: Data Âncora + (numeroParcelaAtual - 1) meses.
   * Esta é a data salva no banco e exibida na Timeline.
   * NUNCA é a mesma para todas as parcelas de um grupo.
   */
  transaction_date: string; // YYYY-MM-DD

  /**
   * Mês de competência/fatura calculado pelo Smart Cycle.
   * Resultado de aplicar a regra M+1/M+2 sobre transaction_date.
   */
  competence_date: string; // YYYY-MM-01

  /** Fração normalizada. Ex: "1/5", "2/5". */
  installment_info: string;

  /** UUID compartilhado por todas as parcelas de uma mesma compra. */
  installment_group_id: string;

  /** true para parcelas projetadas (não lidas diretamente no PDF). */
  is_projection: boolean;

  /** Hash para deduplicação: `transaction_date|amount|merchant_name` */
  fingerprint: string;

  category_id: string | null;
  original_description: string;
}

// ─────────────────────────────────────────────
// CAMADA 4: Resultado da Validação de Checksum
// ─────────────────────────────────────────────

export interface ChecksumResult {
  isValid: boolean;
  extractedSum: number;
  reportedTotal: number;
  divergence: number;
  errorMessage?: string;
}

// ─────────────────────────────────────────────
// LÓGICA: Smart Cycle — resultado da alocação
// ─────────────────────────────────────────────

export interface SmartCycleAllocation {
  /** Mês da fatura de destino. Formato YYYY-MM-01. */
  competence_date: string;
  /** M+1 ou M+2 */
  rule: "M+1" | "M+2";
}

// ─────────────────────────────────────────────
// FUNÇÃO VALIDADORA: Pseudo-implementação de referência
// ─────────────────────────────────────────────

/**
 * Valida se a extração da IA é consistente antes de processar.
 * Bloqueia importações parciais (truncamento de dados).
 */
export function validateExtraction(extraction: RawInvoiceExtraction): ChecksumResult {
  const extractedSum = extraction.transactions
    .filter(tx => tx.amount > 0)
    .reduce((acc, tx) => acc + tx.amount, 0);

  const divergence = Math.abs(extractedSum - extraction.total_amount);
  const TOLERANCE = 0.02; // R$ 0,02 de tolerância para arredondamento

  if (divergence > TOLERANCE) {
    return {
      isValid: false,
      extractedSum,
      reportedTotal: extraction.total_amount,
      divergence,
      errorMessage: `EXTRAÇÃO INCOMPLETA: Soma extraída R$ ${extractedSum.toFixed(2)} ≠ Total da fatura R$ ${extraction.total_amount.toFixed(2)}. A IA pode ter truncado a lista de transações.`,
    };
  }

  return { isValid: true, extractedSum, reportedTotal: extraction.total_amount, divergence };
}

/**
 * Calcula o mês de competência (Smart Cycle) para uma data de transação.
 *
 * Regra:
 *   dia_tx <= dia_fechamento → Fatura M+1
 *   dia_tx >  dia_fechamento → Fatura M+2 (pulo de fatura)
 */
export function applySmartCycle(
  transactionDate: string, // YYYY-MM-DD
  card: CardCycleConfig,
): SmartCycleAllocation {
  const [yearStr, monthStr, dayStr] = transactionDate.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const day = parseInt(dayStr, 10);

  const monthOffset = day <= card.closing_day ? 1 : 2;
  const rule: "M+1" | "M+2" = day <= card.closing_day ? "M+1" : "M+2";

  let targetMonth = month + monthOffset;
  let targetYear = year;

  if (targetMonth > 12) {
    targetYear += Math.floor((targetMonth - 1) / 12);
    targetMonth = ((targetMonth - 1) % 12) + 1;
  }

  return {
    competence_date: `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`,
    rule,
  };
}

/**
 * Adiciona meses a uma data com clamp no último dia do mês.
 * Ex: addMonthsSafe(31/Jan, 1) → 28/Fev (não pula para Março).
 */
export function addMonthsSafe(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}
