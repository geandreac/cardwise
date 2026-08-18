import { GoogleGenAI, Type } from "@google/genai";
import type { ParsedInvoice } from "./parse-pdf";

/**
 * Extração de faturas via Gemini, enviando o PDF NATIVAMENTE.
 *
 * Diferença central em relação ao caminho Groq: aqui não há extração de texto.
 * O modelo lê o PDF com o layout preservado, o que resolve as duas falhas
 * clássicas do `unpdf`:
 *   - faturas em colunas, onde a extração linear embaralha data/valor;
 *   - PDFs escaneados, dos quais não sai texto nenhum.
 *
 * O free tier do Gemini tem 250.000 TPM (contra 8.000 da Groq), então a fatura
 * inteira cabe numa única chamada — sem divisão em lotes.
 */

/**
 * Modelo padrão. Sobrescreva com GEMINI_MODEL se quiser testar outro.
 *
 * Fixado numa versão em vez de usar "gemini-flash-latest" de propósito: um
 * alias que troca de modelo sozinho mudaria a qualidade da extração de faturas
 * sem aviso. Aqui a atualização é uma decisão explícita.
 *
 * Atenção: os modelos 2.5 ainda aparecem em /models mas foram descontinuados
 * para contas novas — a API responde "no longer available to new users".
 */
const MODELO_PADRAO = "gemini-3.5-flash";

/**
 * Cadeia de fallback caso o principal esteja indisponível ou sem cota.
 *
 * O 3.6-flash NÃO é o padrão de propósito: medido em faturas reais, ele
 * respondeu "high demand" em 3 de 4 chamadas, enquanto o 3.5-flash respondeu
 * sempre. Fica como alternativa, não como primeira opção.
 */
const MODELOS_FALLBACK = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];

/** Limite de segurança para envio inline (a API aceita ~20MB por requisição). */
const MAX_BYTES_PDF = 15 * 1024 * 1024;

const INSTRUCOES = `Você é um extrator literal de dados de faturas de cartão de crédito brasileiro.
Leia o PDF anexado e retorne um JSON EXATO com os dados.

REGRAS ABSOLUTAS — VIOLAÇÃO INVALIDA A RESPOSTA:

1. PARCELAS: É EXPRESSAMENTE PROIBIDO deduzir, recalcular ou alterar o denominador de uma parcela.
   Leia a string literal. Se diz "PARC 02/03", retorne installment_info "2/3".
   Se diz "PARC 05/05", retorne installment_info "5/5".
   NUNCA reduza o denominador. NUNCA iguale numerador e denominador arbitrariamente.

2. DATAS: Copie o dia e mês EXATAMENTE como impressos na linha da transação. NÃO altere.
   Se a linha diz "19/12", a data é dia 19, mês 12. Se diz "20/03", é dia 20, mês 03.

3. NÃO extraia linhas de "PAGAMENTO EFETUADO", "SALDO ANTERIOR", "ESTORNO", "CRÉDITO".

4. NÃO trunque a lista. Extraia TODAS as linhas de débito até "Total da Fatura".

5. Extraia TODAS as seções: compras nacionais, parceladas, internacionais, encargos, IOF.

6. total_amount é o valor IMPRESSO como "Total da fatura" / "Total a pagar".
   COPIE esse número; NÃO some as transações para chegar nele.

6b. period_debits é a soma das compras do período DECLARADA PELA FATURA — a
   linha "(+) Compras/Débitos", "Compras nacionais" ou equivalente do resumo.
   COPIE esse número também. Se a fatura não trouxer essa linha, use 0.
   Atenção: numa fatura com saldo anterior, total_amount ≠ period_debits,
   porque total = saldo anterior − pagamentos + compras. Os dois campos são
   diferentes e devem ser copiados separadamente, cada um do seu lugar.

7. Para closing_date: se houver período (ex: "31 Mar a 30 Abr"), use a data FINAL.

8. Datas no formato YYYY-MM-DD. Para o campo "date" use o ano da fatura;
   se o mês da transação for maior que o mês de fechamento, use o ano anterior.

9. Para "installment_info": copie a fração literal ("2/3", "5/5").
   Se a compra não for parcelada, retorne string vazia "".

10. DESCRIÇÃO: "description" é APENAS o nome do estabelecimento, sem o marcador
    de parcela e sem o número do cartão. A fração vai só em "installment_info".
    Exemplo: a linha "19/12 LOJA MOVEIS CASA PARC 02/03 320,40" produz
    description "LOJA MOVEIS CASA" e installment_info "2/3" — nunca
    description "LOJA MOVEIS CASA PARC 02/03".
    Essa regra é obrigatória: a descrição é usada para deduplicar transações,
    então precisa ser idêntica entre faturas de meses diferentes.`;

/**
 * Schema de saída. O Gemini garante a forma da resposta, o que elimina
 * a classe de erro "campo faltando" e dispensa parsing defensivo.
 */
const SCHEMA = {
  type: Type.OBJECT,
  required: ["bank", "due_date", "closing_date", "total_amount", "period_debits", "transactions"],
  properties: {
    bank: { type: Type.STRING },
    due_date: { type: Type.STRING },
    closing_date: { type: Type.STRING },
    total_amount: { type: Type.NUMBER },
    period_debits: { type: Type.NUMBER },
    transactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["date", "description", "amount", "installment_info"],
        properties: {
          date: { type: Type.STRING },
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          installment_info: { type: Type.STRING },
        },
      },
    },
  },
};

/** "02/03" → "2/3"; vazio/ausente → null. */
export function normalizarParcela(valor: string | null | undefined): string | null {
  const bruto = valor?.trim();
  if (!bruto) return null;
  const m = bruto.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return bruto;
  const atual = Number(m[1]);
  const total = Number(m[2]);
  if (!atual || !total) return null;
  return `${atual}/${total}`;
}

export function geminiEstaConfigurado(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * O SDK do Google entrega o erro como um JSON inteiro dentro de `message`.
 * Jogar isso na tela do usuário (ou num log) é ilegível — extraímos só o essencial.
 */
export function mensagemDeErroGemini(error: unknown): string {
  const bruto = String((error as Error)?.message ?? error ?? "erro desconhecido");
  try {
    const json = JSON.parse(bruto);
    const e = json?.error;
    if (e?.message) {
      const razao = e.details?.find((d: any) => d.reason)?.reason;
      return razao ? `${e.message} (${razao})` : e.message;
    }
  } catch {
    // Não era JSON — usa o texto como veio.
  }
  return bruto.length > 300 ? `${bruto.slice(0, 300)}…` : bruto;
}

/** Erros em que vale tentar o próximo modelo da cadeia. */
function ehErroTransitorio(error: unknown): boolean {
  const msg = String((error as Error)?.message ?? "").toLowerCase();
  const status = (error as { status?: number })?.status;
  if (status === 429 || status === 503 || status === 500) return true;
  return (
    msg.includes("quota") ||
    msg.includes("rate") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("not found") ||
    msg.includes("resource_exhausted")
  );
}

/**
 * Extrai a fatura a partir dos bytes do PDF.
 * Retorna null se o Gemini não estiver configurado — o chamador decide o fallback.
 * Lança erro se estiver configurado e todos os modelos falharem.
 */
export async function parseFaturaComGemini(pdfBytes: Uint8Array): Promise<ParsedInvoice | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  if (pdfBytes.byteLength > MAX_BYTES_PDF) {
    throw new Error(
      `PDF de ${(pdfBytes.byteLength / 1024 / 1024).toFixed(1)}MB excede o limite de ${MAX_BYTES_PDF / 1024 / 1024}MB para envio direto.`
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64 = Buffer.from(pdfBytes).toString("base64");

  const modelos = [process.env.GEMINI_MODEL || MODELO_PADRAO, ...MODELOS_FALLBACK];
  let ultimoErro: unknown = null;

  for (const model of modelos) {
    try {
      const resposta = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "application/pdf", data: base64 } },
              { text: "Extraia os dados desta fatura seguindo as regras." },
            ],
          },
        ],
        config: {
          systemInstruction: INSTRUCOES,
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: SCHEMA,
        },
      });

      const texto = resposta.text;
      if (!texto) throw new Error("Resposta vazia do Gemini.");

      const parsed = JSON.parse(texto) as ParsedInvoice & {
        transactions: { installment_info: string | null }[];
      };

      if (!Array.isArray(parsed.transactions) || parsed.transactions.length === 0) {
        throw new Error("O Gemini não retornou transações.");
      }

      // O schema exige string; o resto do sistema espera null quando não é parcelada.
      // Também normalizamos "02/03" → "2/3": os bancos imprimem com e sem zero à
      // esquerda, e o valor é gravado no banco de dados como veio.
      parsed.transactions = parsed.transactions.map((tx) => ({
        ...tx,
        installment_info: normalizarParcela(tx.installment_info),
      }));

      if (model !== modelos[0]) {
        console.warn(`[Gemini] Modelo principal indisponível — respondido por "${model}".`);
      }

      return parsed;
    } catch (error) {
      ultimoErro = error;
      console.error(`[Gemini] Falha com o modelo ${model}: ${mensagemDeErroGemini(error)}`);
      if (ehErroTransitorio(error)) continue;
      // Erro definitivo (chave inválida, PDF corrompido): não adianta insistir.
      throw new Error(mensagemDeErroGemini(error));
    }
  }

  throw new Error(
    `Nenhum modelo Gemini disponível (tentados: ${modelos.join(", ")}). Último erro: ${mensagemDeErroGemini(ultimoErro)}`
  );
}
