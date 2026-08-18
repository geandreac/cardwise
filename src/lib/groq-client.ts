import Groq from "groq-sdk";

/**
 * Cliente Groq centralizado.
 *
 * A Groq descontinua modelos periodicamente (ex.: llama-3.3-70b-versatile foi
 * removido e passou a devolver 404 model_not_found). Para que isso não derrube
 * o upload de faturas, trabalhamos com uma CADEIA de modelos: se o primeiro
 * falhar por indisponibilidade, tentamos o próximo automaticamente.
 *
 * A ordem pode ser sobrescrita pela env GROQ_MODELS (lista separada por vírgula).
 */
const DEFAULT_MODEL_CHAIN = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
];

const modelosDaEnv = (process.env.GROQ_MODELS ?? "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export const GROQ_MODEL_CHAIN: string[] =
  modelosDaEnv.length > 0 ? modelosDaEnv : DEFAULT_MODEL_CHAIN;

let cachedClient: Groq | null = null;

export function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!cachedClient) {
    cachedClient = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 2 });
  }
  return cachedClient;
}

/**
 * Limite de tokens por minuto da conta (free tier da Groq = 8.000).
 * Vale para prompt + max_completion_tokens SOMADOS: a Groq reserva o teto de
 * saída no orçamento do minuto. Ajuste via env ao migrar de plano.
 */
export const GROQ_TPM_LIMIT = Number(process.env.GROQ_TPM_LIMIT ?? 8000);

/** O modelo saiu do ar / não existe mais — trocar de modelo pode resolver. */
function ehErroDeModelo(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const msg = String((error as Error)?.message ?? "").toLowerCase();
  if (status === 404 || msg.includes("model_not_found") || msg.includes("does not exist")) return true;
  return status === 503 || status === 502;
}

/** Rate limit (TPM/RPM). Trocar de modelo NÃO ajuda — a cota é da organização. */
function ehRateLimit(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const msg = String((error as Error)?.message ?? "").toLowerCase();
  return status === 429 || status === 413 || msg.includes("rate_limit_exceeded");
}

/** Segundos a esperar segundo o header retry-after, limitado a um teto sensato. */
function segundosDeEspera(error: unknown, teto = 30): number {
  const headers = (error as { headers?: Headers | Record<string, string> })?.headers;
  const raw =
    headers instanceof Headers
      ? headers.get("retry-after")
      : (headers as Record<string, string> | undefined)?.["retry-after"];
  const segundos = Number(raw);
  if (!Number.isFinite(segundos) || segundos <= 0) return 2;
  return Math.min(segundos, teto);
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Modelos que gastam tokens com raciocínio interno antes de responder. */
function ehModeloReasoning(model: string): boolean {
  return model.includes("gpt-oss") || model.includes("qwen");
}

export type GroqJSONOptions = {
  messages: { role: "system" | "user"; content: string }[];
  temperature?: number;
  maxTokens?: number;
  /** JSON Schema opcional — ativa structured outputs em modelos que suportam. */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
};

/**
 * Executa um completion em modo JSON percorrendo a cadeia de modelos.
 * Retorna o conteúdo bruto (string) da resposta.
 * Lança erro apenas se TODOS os modelos falharem.
 */
export async function groqChatJSON(options: GroqJSONOptions): Promise<string> {
  const groq = getGroqClient();
  if (!groq) throw new Error("GROQ_API_KEY não configurada.");

  const { messages, temperature = 0, maxTokens, jsonSchema } = options;
  let ultimoErro: unknown = null;

  // Formatos em ordem de preferência: structured outputs, depois JSON simples.
  const formatos: { type: "json_schema" | "json_object"; json_schema?: unknown }[] = jsonSchema
    ? [
        { type: "json_schema", json_schema: { name: jsonSchema.name, strict: true, schema: jsonSchema.schema } },
        { type: "json_object" },
      ]
    : [{ type: "json_object" }];

  for (const model of GROQ_MODEL_CHAIN) {
    let indiceFormato = 0;
    let esperasRestantes = 2; // no máximo 2 pausas por rate limit, por modelo

    while (indiceFormato < formatos.length) {
      const response_format = formatos[indiceFormato];
      try {
        const completion = await groq.chat.completions.create({
          model,
          temperature,
          messages,
          ...(maxTokens ? { max_completion_tokens: maxTokens } : {}),
          // Modelos gpt-oss/qwen são "reasoning": o raciocínio consome o mesmo
          // orçamento de max_completion_tokens e pode truncar o JSON antes do
          // fim. Extração de fatura é tarefa literal, não precisa de raciocínio.
          ...(ehModeloReasoning(model) ? { reasoning_effort: "low" } : {}),
          response_format: response_format as never,
        } as never);

        const choice = completion.choices[0];
        if (choice?.finish_reason === "length") {
          console.warn(`[Groq] Resposta truncada por limite de tokens (modelo ${model}).`);
        }

        const content = choice?.message?.content;
        if (!content) throw new Error("Resposta vazia do modelo.");

        if (model !== GROQ_MODEL_CHAIN[0]) {
          console.warn(`[Groq] Modelo primário indisponível — respondido por fallback "${model}".`);
        }
        return content;
      } catch (error) {
        ultimoErro = error;
        const msg = String((error as Error)?.message ?? "").toLowerCase();

        // json_schema não suportado, ou a geração estourou o limite e o JSON
        // não fechou (json_validate_failed) → tenta json_object, mais tolerante.
        if (
          response_format.type === "json_schema" &&
          (msg.includes("response_format") || msg.includes("json_schema") || msg.includes("json_validate_failed"))
        ) {
          console.warn(`[Groq] structured output falhou em ${model} — repetindo com json_object.`);
          indiceFormato++;
          continue;
        }

        // Rate limit: a cota é da organização, então esperar é a única saída.
        if (ehRateLimit(error) && esperasRestantes > 0) {
          const espera = segundosDeEspera(error);
          esperasRestantes--;
          console.warn(`[Groq] Rate limit atingido — aguardando ${espera}s antes de repetir.`);
          await dormir(espera * 1000);
          continue; // mesmo modelo, mesmo formato
        }

        if (ehErroDeModelo(error)) break; // próximo modelo da cadeia
        if (ehRateLimit(error)) throw error; // esgotou as esperas — propaga

        throw error; // erro real (auth, payload inválido) — não adianta insistir
      }
    }
  }

  const detalhe = ultimoErro instanceof Error ? ultimoErro.message : "erro desconhecido";
  throw new Error(
    `Nenhum modelo Groq disponível (tentados: ${GROQ_MODEL_CHAIN.join(", ")}). Último erro: ${detalhe}`
  );
}

/** Extrai o primeiro objeto JSON de uma string, tolerando texto ao redor. */
export function extrairJSON<T>(content: string): T | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
