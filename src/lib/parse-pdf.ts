export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  installment_info: string | null;
}

export interface ParsedInvoice {
  bank: string;
  due_date: string;
  closing_date: string;
  total_amount: number;
  reference_month: string;
  transactions: ParsedTransaction[];
}

const MONTH_MAP: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
  janeiro: "01", fevereiro: "02", março: "03", abril: "04", maio: "05",
  junho: "06", julho: "07", agosto: "08", setembro: "09", outubro: "10",
  novembro: "11", dezembro: "12",
};

function parseBRL(value: string): number {
  return parseFloat(value.replace(/\./g, "").replace(",", "."));
}

function inferYear(month: string, referenceYear: number, referenceMonth: number): number {
  const m = parseInt(month);
  if (m > referenceMonth + 2) return referenceYear - 1;
  return referenceYear;
}

function parseNubank(text: string): ParsedInvoice | null {
  const dueMatch = text.match(/Data de vencimento[:\s]+(\d{2})\s+([A-Z]{3})\s+(\d{4})/i);
  if (!dueMatch) return null;
  const dueDate = `${dueMatch[3]}-${MONTH_MAP[dueMatch[2].toLowerCase()]}-${dueMatch[1]}`;
  const refYear = parseInt(dueMatch[3]);
  const refMonth = parseInt(MONTH_MAP[dueMatch[2].toLowerCase()]);

  const periodMatch = text.match(/Período vigente[:\s]+(\d{2})\s+([A-Z]{3})\s+a\s+(\d{2})\s+([A-Z]{3})/i);
  let closingDate = dueDate;
  let referenceMonth = `${refYear}-${String(refMonth - 1).padStart(2, "0")}-01`;

  if (periodMatch) {
    const closeMonth = MONTH_MAP[periodMatch[4].toLowerCase()];
    const closeYear = inferYear(closeMonth, refYear, refMonth);
    closingDate = `${closeYear}-${closeMonth}-${periodMatch[3]}`;
    referenceMonth = `${closeYear}-${closeMonth}-01`;
  }

  const totalMatch = text.match(/Total a pagar\s+R\$\s*([\d.,]+)/i);
  const total = totalMatch ? parseBRL(totalMatch[1]) : 0;

  const transactions: ParsedTransaction[] = [];
  const txRegex = /(\d{2})\s+([A-Z]{3})\s+[•·\*]+\s*\d+\s+(.+?)\s+R\$\s*([\d.,]+)/gi;
  let match;
  while ((match = txRegex.exec(text)) !== null) {
    const txMonth = MONTH_MAP[match[2].toLowerCase()];
    if (!txMonth) continue;
    const description = match[3].trim();
    if (/pagamento|crédito|rotativo|IOF|juros/i.test(description)) continue;
    const txYear = inferYear(txMonth, refYear, refMonth);
    const installMatch = description.match(/[–\-]\s*Parcela\s+(\d+)\/(\d+)/i);
    const cleanDesc = description.replace(/[–\-]\s*Parcela\s+\d+\/\d+/i, "").trim();
    transactions.push({
      date: `${txYear}-${txMonth}-${match[1]}`,
      description: cleanDesc,
      amount: parseBRL(match[4]),
      installment_info: installMatch ? `${installMatch[1]}/${installMatch[2]}` : null,
    });
  }

  return { bank: "Nubank", due_date: dueDate, closing_date: closingDate, total_amount: total, reference_month: referenceMonth, transactions };
}

function parseInter(text: string): ParsedInvoice | null {
  const dueMatch = text.match(/Data de Vencimento\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!dueMatch) return null;
  const dueDate = `${dueMatch[3]}-${dueMatch[2]}-${dueMatch[1]}`;
  const refYear = parseInt(dueMatch[3]);
  const refMonth = parseInt(dueMatch[2]);
  const referenceMonth = `${refYear}-${String(refMonth - 1).padStart(2, "0")}-01`;

  const cutMatch = text.match(/Data de corte[:\s]+(\d{2})\/(\d{2})\/(\d{4})/i);
  const closingDate = cutMatch ? `${cutMatch[3]}-${cutMatch[2]}-${cutMatch[1]}` : dueDate;

  const totalMatch = text.match(/Total da sua fatura\s*R\$\s*([\d.,]+)/i);
  const total = totalMatch ? parseBRL(totalMatch[1]) : 0;

  const transactions: ParsedTransaction[] = [];
  const txRegex = /(\d{2})\s+de\s+(\w+)\.?\s+(\d{4})\s+(.+?)\s+-R\$\s*([\d.,]+)/gi;
  let match;
  while ((match = txRegex.exec(text)) !== null) {
    const txMonth = MONTH_MAP[match[2].toLowerCase()];
    if (!txMonth) continue;
    const description = match[4].trim();
    if (/pagamento|crédito|pix on line/i.test(description)) continue;
    const installMatch = description.match(/\(Parcela\s+(\d+)\s+de\s+(\d+)\)/i);
    const cleanDesc = description.replace(/\(Parcela\s+\d+\s+de\s+\d+\)/i, "").trim();
    transactions.push({
      date: `${match[3]}-${txMonth}-${match[1]}`,
      description: cleanDesc,
      amount: parseBRL(match[5]),
      installment_info: installMatch ? `${installMatch[1]}/${installMatch[2]}` : null,
    });
  }

  return { bank: "Inter", due_date: dueDate, closing_date: closingDate, total_amount: total, reference_month: referenceMonth, transactions };
}

function parseBradescard(text: string): ParsedInvoice | null {
  const dueMatch = text.match(/Vencimento\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!dueMatch) return null;
  const dueDate = `${dueMatch[3]}-${dueMatch[2]}-${dueMatch[1]}`;
  const refYear = parseInt(dueMatch[3]);
  const refMonth = parseInt(dueMatch[2]);
  const referenceMonth = `${refYear}-${String(refMonth - 1).padStart(2, "0")}-01`;

  const totalMatch = text.match(/TOTAL DA FATURA\s*R\$\s*([\d.,]+)/i);
  const total = totalMatch ? parseBRL(totalMatch[1]) : 0;

  const transactions: ParsedTransaction[] = [];
  const txRegex = /(\d{2})\/(\d{2})\s+(.+?)\s+([\d.,]+)\s*$/gm;
  let match;
  while ((match = txRegex.exec(text)) !== null) {
    const description = match[3].trim();
    if (/pagamento|anuidade|saldo fatura/i.test(description)) continue;
    const year = inferYear(match[2], refYear, refMonth);
    const installMatch = description.match(/[–\-]\s*(\d+)\/(\d+)/);
    const cleanDesc = description.replace(/[–\-]\s*\d+\/\d+/, "").trim();
    transactions.push({
      date: `${year}-${match[2]}-${match[1]}`,
      description: cleanDesc,
      amount: parseBRL(match[4]),
      installment_info: installMatch ? `${installMatch[1]}/${installMatch[2]}` : null,
    });
  }

  return { bank: "Bradescard", due_date: dueDate, closing_date: dueDate, total_amount: total, reference_month: referenceMonth, transactions };
}

function parseCarrefour(text: string): ParsedInvoice | null {
  const dueMatch = text.match(/(?:Data de Vencimento|Vencimento)[:\s]+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!dueMatch) return null;
  const dueDate = `${dueMatch[3]}-${dueMatch[2]}-${dueMatch[1]}`;
  const refYear = parseInt(dueMatch[3]);
  const refMonth = parseInt(dueMatch[2]);
  const referenceMonth = `${refYear}-${String(refMonth - 1).padStart(2, "0")}-01`;

  const totalMatch = text.match(/TOTAL DA\s+(?:SUA\s+)?FATURA(?:\s+ATUAL)?:?\s*R\$\s*([\d.,]+)/i);
  const total = totalMatch ? parseBRL(totalMatch[1]) : 0;

  const transactions: ParsedTransaction[] = [];
  const txRegex = /(\d{2})\/(\d{2})\s+(.+?)\s+([\d.,]+)\s*$/gm;
  let match;
  while ((match = txRegex.exec(text)) !== null) {
    const description = match[3].trim();
    if (/pagamento|anuidade|saldo fatura/i.test(description)) continue;
    const year = inferYear(match[2], refYear, refMonth);
    const installMatch = description.match(/[–\-]\s*(\d+)\/(\d+)/);
    const cleanDesc = description.replace(/[–\-]\s*\d+\/\d+/, "").trim();
    transactions.push({
      date: `${year}-${match[2]}-${match[1]}`,
      description: cleanDesc,
      amount: parseBRL(match[4]),
      installment_info: installMatch ? `${installMatch[1]}/${installMatch[2]}` : null,
    });
  }

  return { bank: "Carrefour", due_date: dueDate, closing_date: dueDate, total_amount: total, reference_month: referenceMonth, transactions };
}

function detectBank(text: string): string {
  if (/nubank|nu pagamentos/i.test(text)) return "nubank";
  if (/banco inter|bancointer/i.test(text)) return "inter";
  if (/bradescard|bradesco cartões/i.test(text)) return "bradescard";
  if (/carrefour|banco csf/i.test(text)) return "carrefour";
  return "unknown";
}

export function parseFatura(text: string): ParsedInvoice | null {
  const bank = detectBank(text);
  switch (bank) {
    case "nubank":     return parseNubank(text);
    case "inter":      return parseInter(text);
    case "bradescard": return parseBradescard(text);
    case "carrefour":  return parseCarrefour(text);
    default:           return null;
  }
}