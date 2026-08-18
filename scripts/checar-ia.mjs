#!/usr/bin/env node
/**
 * Diagnóstico dos provedores de IA usados na leitura de faturas.
 *
 *   npm run check:ia
 *
 * Verifica se cada chave é válida, quais modelos estão disponíveis e
 * traduz os erros mais comuns em instruções do que fazer.
 */
import fs from "node:fs";
import path from "node:path";

// Carrega .env.local (split com /\r?\n/ porque `.` não casa com \r em regex JS).
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const linha of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
}

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;
const amarelo = (s) => `\x1b[33m${s}\x1b[0m`;
const cinza = (s) => `\x1b[90m${s}\x1b[0m`;

/** Traduz os erros mais comuns do Gemini em uma ação concreta. */
function diagnosticarGemini(status, corpo) {
  const razao = corpo?.error?.details?.find((d) => d.reason)?.reason ?? "";

  if (razao === "API_KEY_INVALID") {
    return "A chave não existe (foi apagada, ou o projeto Google Cloud foi deletado).\n" +
           "   → Gere outra em https://aistudio.google.com/apikey";
  }
  if (razao === "SERVICE_DISABLED" || status === 403) {
    return "A chave existe, mas a Generative Language API não está habilitada no projeto.\n" +
           "   → Crie a chave pelo AI Studio (habilita sozinho) em vez do Cloud Console.";
  }
  if (status === 429) {
    return "Chave válida, mas a cota do minuto/dia está esgotada. Aguarde e tente de novo.";
  }
  return corpo?.error?.message ?? `HTTP ${status}`;
}

async function checarGemini() {
  console.log("\n── Gemini ──────────────────────────────");
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    console.log(amarelo("⚠  GEMINI_API_KEY ausente no .env.local"));
    console.log(cinza("   Gere em https://aistudio.google.com/apikey"));
    return false;
  }
  console.log(cinza(`   chave: ${key.slice(0, 6)}…${key.slice(-4)} (${key.length} caracteres)`));

  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": key },
    });
    const corpo = await r.json();

    if (!r.ok) {
      console.log(vermelho("✗  chave rejeitada"));
      console.log(`   ${diagnosticarGemini(r.status, corpo)}`);
      return false;
    }

    const modelos = (corpo.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace("models/", ""));

    console.log(verde(`✓  chave válida — ${modelos.length} modelos listados`));

    // Estar na lista NÃO significa estar acessível: modelos descontinuados
    // continuam aparecendo em /models e só falham na hora de gerar. Por isso
    // aqui fazemos uma chamada real, não só uma checagem de existência.
    // Mantenha em sincronia com MODELO_PADRAO de src/lib/gemini-parse.ts —
    // testar um modelo diferente do que o app usa torna o diagnóstico inútil.
    const escolhido = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const teste = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${escolhido}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "responda apenas: ok" }] }] }),
      }
    );

    if (teste.ok) {
      console.log(verde(`✓  modelo "${escolhido}" respondeu a uma chamada real`));
      return true;
    }

    const erroTeste = await teste.json();
    console.log(vermelho(`✗  modelo "${escolhido}" está listado mas NÃO responde`));
    console.log(`   ${erroTeste?.error?.message ?? teste.status}`);
    console.log(cinza(`   Alternativas listadas: ${modelos.filter((m) => m.includes("flash")).slice(0, 5).join(", ")}`));
    console.log(cinza(`   Defina GEMINI_MODEL no .env.local para usar outro.`));
    return false;
  } catch (e) {
    console.log(vermelho(`✗  erro de rede: ${e.message}`));
    return false;
  }
}

async function checarGroq() {
  console.log("\n── Groq (fallback) ─────────────────────");
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    console.log(amarelo("⚠  GROQ_API_KEY ausente — sem rede de segurança se o Gemini falhar."));
    return false;
  }
  console.log(cinza(`   chave: ${key.slice(0, 6)}…${key.slice(-4)}`));

  try {
    const r = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const corpo = await r.json();

    if (!r.ok) {
      console.log(vermelho(`✗  chave rejeitada: ${corpo?.error?.message ?? r.status}`));
      return false;
    }

    const disponiveis = new Set((corpo.data ?? []).map((m) => m.id));
    const cadeia = (process.env.GROQ_MODELS ?? "openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.6-27b")
      .split(",")
      .map((s) => s.trim());

    console.log(verde(`✓  chave válida — ${disponiveis.size} modelos na conta`));
    for (const m of cadeia) {
      console.log(disponiveis.has(m) ? verde(`✓  ${m}`) : vermelho(`✗  ${m} — indisponível`));
    }
    return true;
  } catch (e) {
    console.log(vermelho(`✗  erro de rede: ${e.message}`));
    return false;
  }
}

const gemini = await checarGemini();
const groq = await checarGroq();

console.log("\n────────────────────────────────────────");
if (gemini) {
  console.log(verde("Faturas serão lidas pelo Gemini (PDF nativo)."));
  if (!groq) console.log(amarelo("Sem fallback configurado — considere manter a GROQ_API_KEY."));
} else if (groq) {
  console.log(amarelo("Gemini indisponível — faturas serão lidas pela Groq (texto extraído)."));
} else {
  console.log(vermelho("Nenhum provedor de IA disponível. O upload de faturas vai falhar."));
  process.exit(1);
}
console.log(cinza("Lembre-se de reiniciar o `npm run dev` após alterar o .env.local.\n"));
