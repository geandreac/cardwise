import { groqChatJSON, extrairJSON } from "./groq-client";

/** Quantos estabelecimentos por chamada — evita respostas truncadas em faturas longas. */
const LOTE_CATEGORIZACAO = 60;

export type CategoriaParaGroq = {
  id: string;
  name: string;
  emoji: string;
};

/**
 * Recebe nomes de estabelecimentos e as categorias disponíveis.
 * Retorna Map { merchant_name -> category_id }.
 * Se a API key não existir ou Groq falhar, retorna vazio.
 */
export async function categorizarTransacoes(
  merchants: string[],
  categorias: CategoriaParaGroq[]
): Promise<Map<string, string>> {
  const resultado = new Map<string, string>();

  if (!process.env.GROQ_API_KEY) {
    console.warn("[Groq] GROQ_API_KEY não configurada — categorização ignorada.");
    return resultado;
  }

  if (merchants.length === 0 || categorias.length === 0) return resultado;

  const merchantsUnicos = [...new Set(merchants)];
  const idsValidos = new Set(categorias.map((c) => c.id));

  const listaCategorias = categorias
    .map((c) => `- ${c.id} | ${c.name} | ${c.emoji}`)
    .join("\n");

  // Processa em lotes: uma fatura com centenas de estabelecimentos estourava
  // o limite de saída e devolvia JSON truncado (todos ficavam sem categoria).
  const lotes: string[][] = [];
  for (let i = 0; i < merchantsUnicos.length; i += LOTE_CATEGORIZACAO) {
    lotes.push(merchantsUnicos.slice(i, i + LOTE_CATEGORIZACAO));
  }

  const respostas = await Promise.all(
    lotes.map((lote) => categorizarLote(lote, listaCategorias))
  );

  for (const parcial of respostas) {
    for (const [merchant, categoryId] of Object.entries(parcial)) {
      if (idsValidos.has(categoryId)) resultado.set(merchant, categoryId);
    }
  }

  return resultado;
}

async function categorizarLote(
  lote: string[],
  listaCategorias: string
): Promise<Record<string, string>> {
  const listaMerchants = lote.map((m) => `- ${m}`).join("\n");

  const prompt = `
Você é um classificador de transações de cartão de crédito do Brasil.

Sua tarefa:
- Para cada estabelecimento, escolha a categoria mais adequada.
- Use somente categorias da lista.
- Responda somente JSON válido.
- Se não tiver confiança, escolha a categoria "Outros" se ela existir.

CATEGORIAS:
${listaCategorias}

ESTABELECIMENTOS:
${listaMerchants}

FORMATO EXATO DE RESPOSTA:
{
  "NOME_EXATO_DO_ESTABELECIMENTO": "UUID_DA_CATEGORIA"
}
`.trim();

  try {
    const content = await groqChatJSON({
      temperature: 0.1,
      maxTokens: 8_000,
      messages: [{ role: "user", content: prompt }],
    });

    return extrairJSON<Record<string, string>>(content) ?? {};
  } catch (error) {
    // Categorização é opcional: falhar aqui não deve impedir a importação.
    console.error("[Groq] Erro ao categorizar transações:", error);
    return {};
  }
}