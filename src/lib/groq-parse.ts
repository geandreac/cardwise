import Groq from "groq-sdk";
import type { ParsedInvoice } from "./parse-pdf";

export async function parseFaturaComGroq(text: string): Promise<ParsedInvoice | null> {
  if (!process.env.GROQ_API_KEY) {
    console.error("[Groq] GROQ_API_KEY não configurada.");
    return null;
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const prompt = `
Você é um extrator de dados de faturas de cartão de crédito do Brasil.
Sua tarefa é ler o texto extraído do PDF da fatura e extrair as transações, data de vencimento, data de fechamento, valor total e nome do banco.

Texto da fatura:
"""
${text.substring(0, 15000)}
"""

Regras de Extração:
1. "bank": Tente identificar o banco (ex: "Nubank", "Inter", "Bradescard", "Carrefour", "Itaú", etc).
2. "due_date": Data de vencimento no formato AAAA-MM-DD.
3. "closing_date": Data de fechamento ou corte no formato AAAA-MM-DD. Se não achar, use a due_date.
4. "total_amount": O valor total da fatura (número decimal, use ponto como separador).
5. "reference_month": Mês de referência no formato AAAA-MM-01. (Você pode inferir subtraindo 1 mês da due_date, mas o sistema irá sobrescrever isso depois, então apenas retorne algo no formato AAAA-MM-01).
6. "transactions": Lista de objetos. Cada transação deve ter:
   - "date": Data real da compra no formato AAAA-MM-DD. CUIDADO COM COMPRAS PARCELADAS E ANO NOVO: Se a fatura é do começo do ano (ex: Fev 2026) e a compra foi em "Dez", você DEVE deduzir que a compra foi no ano anterior (Dez 2025). Sempre aplique lógica temporal se o mês da compra for muito maior que o mês da fatura.
   - "description": Nome do estabelecimento limpo (remova "Parcela X/Y", etc). Ignore pagamentos de fatura, juros, IOF e saldo anterior.
   - "amount": Valor da transação (número decimal positivo).
   - "installment_info": Informação de parcela no formato "X/Y" se for compra parcelada, caso contrário, null.

Responda SOMENTE e EXATAMENTE com um objeto JSON válido (sem markdown \`\`\`json) neste formato:
{
  "bank": "Nome do Banco",
  "due_date": "YYYY-MM-DD",
  "closing_date": "YYYY-MM-DD",
  "total_amount": 1234.56,
  "reference_month": "YYYY-MM-01",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Nome Estabelecimento",
      "amount": 99.90,
      "installment_info": "1/3"
    }
  ]
}
`.trim();

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    
    // Fallback regex to extract JSON just in case
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ParsedInvoice;
    
    // Basic validation
    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
        return null;
    }

    return parsed;
  } catch (error) {
    console.error("[Groq] Erro ao extrair dados da fatura:", error);
    return null;
  }
}
