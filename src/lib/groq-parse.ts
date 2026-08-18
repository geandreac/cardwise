import { groqChatJSON, extrairJSON, GROQ_MODEL_CHAIN, GROQ_TPM_LIMIT } from "./groq-client";
import { parseFatura, type ParsedInvoice, type ParsedTransaction } from "./parse-pdf";
import { reduzirTextoFatura, estimarTokens } from "./pdf-preprocess";

/** Margem de segurança sobre o TPM: a contagem real da Groq difere da estimativa. */
const MARGEM_TPM = 0.8;

/**
 * Schema de saída — com structured outputs o modelo é OBRIGADO a devolver
 * exatamente esta forma, o que elimina a classe de erro "campo faltando".
 */
const INVOICE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["bank", "due_date", "closing_date", "total_amount", "transactions"],
  properties: {
    bank: { type: "string" },
    due_date: { type: "string", description: "YYYY-MM-DD" },
    closing_date: { type: "string", description: "YYYY-MM-DD" },
    total_amount: { type: "number" },
    transactions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "description", "amount", "installment_info"],
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          description: { type: "string" },
          amount: { type: "number" },
          installment_info: {
            type: ["string", "null"],
            description: 'Fração literal como "2/3", ou null se não parcelada',
          },
        },
      },
    },
  },
} as const;

/** Tokens de JSON gerados por transação extraída (medido: ~45 + raciocínio). */
const TOKENS_POR_TRANSACAO = 55;

/** Reserva fixa para o raciocínio interno do modelo e o cabeçalho do JSON. */
const TOKENS_OVERHEAD_SAIDA = 800;

/** Linhas do texto reduzido que provavelmente virarão transações. */
function contarLinhasComValor(texto: string): number {
  return texto.split("\n").filter((l) => /\d{1,3}(?:\.\d{3})*,\d{2}/.test(l)).length;
}

/** Quanto podemos reservar para a saída sem estourar o TPM da conta. */
function orcamentoDeSaida(systemPrompt: string, corpo: string): number {
  const entrada = estimarTokens(systemPrompt) + estimarTokens(corpo);
  const disponivel = Math.floor(GROQ_TPM_LIMIT * MARGEM_TPM) - entrada;
  const necessario = contarLinhasComValor(corpo) * TOKENS_POR_TRANSACAO + TOKENS_OVERHEAD_SAIDA;
  // Pede o que precisa, sem ultrapassar o que sobra do minuto.
  return Math.max(1_500, Math.min(necessario, disponivel, 16_000));
}

/**
 * Divide o texto da fatura em lotes que caibam no TPM.
 *
 * O gargalo é a SAÍDA, não a entrada: uma linha de 60 caracteres (~19 tokens)
 * vira um objeto JSON de ~55 tokens. Por isso o corte considera entrada + saída
 * projetada. Cada lote repete o cabeçalho para o modelo não perder banco/ano.
 */
function dividirEmLotes(texto: string, systemPrompt: string): string[] {
  const tokensSistema = estimarTokens(systemPrompt);
  const orcamento = Math.floor(GROQ_TPM_LIMIT * MARGEM_TPM) - tokensSistema - TOKENS_OVERHEAD_SAIDA;

  const custo = (linha: string) =>
    estimarTokens(linha) + (/\d{1,3}(?:\.\d{3})*,\d{2}/.test(linha) ? TOKENS_POR_TRANSACAO : 0);

  const linhas = texto.split("\n");
  const custoTotal = linhas.reduce((acc, l) => acc + custo(l), 0);
  if (custoTotal <= orcamento) return [texto];

  const cabecalho = linhas.slice(0, 20).join("\n");
  const custoCabecalho = linhas.slice(0, 20).reduce((acc, l) => acc + custo(l), 0);

  const lotes: string[] = [];
  let atual: string[] = [];
  let custoAtual = custoCabecalho;

  for (const linha of linhas.slice(20)) {
    const c = custo(linha);
    if (custoAtual + c > orcamento && atual.length > 0) {
      lotes.push(`${cabecalho}\n${atual.join("\n")}`);
      atual = [];
      custoAtual = custoCabecalho;
    }
    atual.push(linha);
    custoAtual += c;
  }

  if (atual.length > 0) lotes.push(`${cabecalho}\n${atual.join("\n")}`);
  return lotes;
}

/**
 * Junta as extrações parciais numa fatura só.
 * Cabeçalho vem do primeiro lote que trouxe cada campo; transações são
 * concatenadas e deduplicadas (o cabeçalho repetido pode gerar repetições).
 */
function mesclarResultados(resultados: ParsedInvoice[]): ParsedInvoice | null {
  if (resultados.length === 0) return null;
  if (resultados.length === 1) return resultados[0];

  const vistas = new Set<string>();
  const transactions: ParsedTransaction[] = [];

  for (const r of resultados) {
    for (const tx of r.transactions ?? []) {
      const chave = `${tx.date}|${tx.description}|${tx.amount}|${tx.installment_info ?? ""}`;
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      transactions.push(tx);
    }
  }

  return {
    bank: resultados.find((r) => r.bank)?.bank ?? "",
    due_date: resultados.find((r) => r.due_date)?.due_date ?? "",
    closing_date: resultados.find((r) => r.closing_date)?.closing_date ?? "",
    // O total impresso na fatura aparece uma vez só — pegamos o maior encontrado.
    total_amount: Math.max(...resultados.map((r) => r.total_amount ?? 0)),
    reference_month: resultados.find((r) => r.reference_month)?.reference_month ?? "",
    transactions,
  };
}

/**
 * Motor de extração de faturas usando Groq.
 * Structured output via JSON schema com prompt anti-alucinação.
 * Se a IA falhar, cai no parser determinístico por regex (parse-pdf).
 */
export async function parseFaturaComGroq(text: string): Promise<ParsedInvoice | null> {
  if (!process.env.GROQ_API_KEY) {
    console.error("[Groq] GROQ_API_KEY não configurada — usando parser determinístico.");
    return parseFatura(text);
  }

  // 1) Remove ruído do PDF: reduz o custo em tokens e melhora a precisão.
  const reduzido = reduzirTextoFatura(text);
  console.info(
    `[Groq] PDF reduzido de ${reduzido.charsOriginais} para ${reduzido.charsFinais} caracteres ` +
      `(${reduzido.linhasTransacao.length} linhas candidatas a transação).`
  );

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

6. total_amount é o valor IMPRESSO na fatura como "Total da fatura" /
   "Total a pagar" / "Valor". COPIE esse número. NÃO some as transações para
   chegar nele — o sistema compara a sua soma com esse total para detectar
   erros de extração, então calcular os dois do mesmo jeito anula a checagem.

7. Para closing_date: se houver período (ex: "31 Mar a 30 Abr"), use a data FINAL.

Retorne OBRIGATORIAMENTE um JSON com esta estrutura exata:
{
  "bank": "Nome do Banco",
  "due_date": "YYYY-MM-DD",
  "closing_date": "YYYY-MM-DD",
  "total_amount": 1234.56,
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
    // 2) Divide em lotes que caibam no orçamento de tokens por minuto.
    //    A Groq soma prompt + max_completion_tokens no consumo do minuto, então
    //    mandar a fatura inteira de uma vez estoura o free tier (8.000 TPM).
    const lotes = dividirEmLotes(reduzido.texto, systemPrompt);

    if (lotes.length > 1) {
      console.info(`[Groq] Fatura grande — extraindo em ${lotes.length} lotes sequenciais.`);
    }

    const resultados: ParsedInvoice[] = [];

    for (const lote of lotes) {
      const content = await groqChatJSON({
        temperature: 0,
        maxTokens: orcamentoDeSaida(systemPrompt, lote),
        jsonSchema: { name: "fatura", schema: INVOICE_SCHEMA as unknown as Record<string, unknown> },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extraia os dados desta fatura:\n\n${lote}` },
        ],
      });

      const parcial = extrairJSON<ParsedInvoice>(content);
      if (parcial && Array.isArray(parcial.transactions)) resultados.push(parcial);
    }

    const parsed = mesclarResultados(resultados);

    if (!parsed || parsed.transactions.length === 0) {
      throw new Error("O modelo não retornou um array 'transactions' válido.");
    }

    return parsed;
  } catch (error: unknown) {
    console.error("[Groq] Erro ao extrair dados da fatura:", error);

    // Último recurso: parser determinístico por regex (Nubank, Itaú, etc.).
    const fallback = parseFatura(text);
    if (fallback && fallback.transactions.length > 0) {
      console.warn("[Groq] Fatura extraída pelo parser determinístico (fallback).");
      return fallback;
    }

    const detalhe = error instanceof Error ? error.message : "erro desconhecido";
    throw new Error(
      `${detalhe} (modelos tentados: ${GROQ_MODEL_CHAIN.join(", ")}; parser determinístico também não reconheceu o layout)`
    );
  }
}
