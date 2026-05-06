import Groq from "groq-sdk";
import type { ParsedInvoice } from "./parse-pdf";

/**
 * Motor de extração de faturas usando Groq (llama-3.3-70b-versatile).
 * Structured output via JSON mode com prompt anti-alucinação.
 */
export async function parseFaturaComGroq(text: string): Promise<ParsedInvoice | null> {
  if (!process.env.GROQ_API_KEY) {
    console.error("[Groq] GROQ_API_KEY não configurada.");
    return null;
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const systemPrompt = `Você é um extrator literal de dados de faturas de cartão de crédito brasileiro.
Sua tarefa é ler o texto bruto extraído do PDF e retornar um JSON EXATO com os dados.

REGRAS ABSOLUTAS — VIOLAÇÃO INVALIDA A RESPOSTA:

1. PARCELAS: É EXPRESSAMENTE PROIBIDO deduzir, recalcular ou alterar o denominador de uma parcela.
   Leia a string literal. Se diz "PARC 02/03", retorne parcela_atual=2 e total_parcelas=3.
   Se diz "PARC 05/05", retorne parcela_atual=5 e total_parcelas=5.
   NUNCA reduza o denominador. NUNCA iguale numerador e denominador arbitrariamente.

2. DATAS: Copie o dia e mês EXATAMENTE como impressos na linha da transação. NÃO altere.
   Se a linha diz "19/12", a data é dia 19, mês 12. Se diz "20/03", é dia 20, mês 03.

3. NÃO extraia linhas de "PAGAMENTO EFETUADO", "SALDO ANTERIOR", "ESTORNO", "CRÉDITO".

4. NÃO trunque a lista. Extraia TODAS as linhas de débito até "Total da Fatura".

5. Extraia TODAS as seções: compras nacionais, parceladas, internacionais, encargos, IOF.

6. O total_amount deve ser APENAS a soma dos débitos (sem pagamentos/créditos).

7. Para closing_date: se houver período (ex: "31 Mar a 30 Abr"), use a data FINAL.

Retorne OBRIGATORIAMENTE um JSON com esta estrutura exata:
{
  "bank": "Nome do Banco",
  "due_date": "YYYY-MM-DD",
  "closing_date": "YYYY-MM-DD",
  "total_amount": 1234.56,
  "reference_month": "YYYY-MM-01",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Nome do Estabelecimento",
      "amount": 99.90,
      "installment_info": "2/3"
    }
  ]
}

Para o campo "date": use o ano da fatura. Se o mês da transação > mês de fechamento, use ano anterior.
Para "installment_info": copie a fração literal ("2/3", "5/5"). Se não parcelada, use null.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extraia os dados desta fatura:\n\n${text.substring(0, 25000)}` },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "{}";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("O modelo não retornou um formato JSON válido.");
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedInvoice;

    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      throw new Error("O JSON extraído não possui o array 'transactions'.");
    }

    return parsed;
  } catch (error: unknown) {
    console.error("[Groq] Erro ao extrair dados da fatura:", error);
    throw new Error(error instanceof Error ? error.message : "Erro desconhecido ao processar fatura");
  }
}
