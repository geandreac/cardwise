import Groq from "groq-sdk";

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

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const merchantsUnicos = [...new Set(merchants)];

  const listaCategorias = categorias
    .map((c) => `- ${c.id} | ${c.name} | ${c.emoji}`)
    .join("\n");

  const listaMerchants = merchantsUnicos.map((m) => `- ${m}`).join("\n");

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
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) return resultado;

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
    const idsValidos = new Set(categorias.map((c) => c.id));

    for (const [merchant, categoryId] of Object.entries(parsed)) {
      if (idsValidos.has(categoryId)) {
        resultado.set(merchant, categoryId);
      }
    }

    return resultado;
  } catch (error) {
    console.error("[Groq] Erro ao categorizar transações:", error);
    return resultado;
  }
}