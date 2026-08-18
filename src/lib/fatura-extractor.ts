import { parseFaturaComGemini, geminiEstaConfigurado } from "./gemini-parse";
import { parseFaturaComGroq } from "./groq-parse";
import type { ParsedInvoice } from "./parse-pdf";

/**
 * Orquestra a extração de faturas entre os provedores disponíveis.
 *
 * Ordem: Gemini (PDF nativo, 250k TPM) → Groq (texto extraído, 8k TPM).
 *
 * O Gemini é primário porque lê o PDF com o layout preservado — faturas em
 * colunas e PDFs escaneados, que o `unpdf` não consegue transformar em texto
 * utilizável, só funcionam por esse caminho. A Groq permanece como rede de
 * segurança para quando a cota diária do Gemini acabar ou a API cair.
 *
 * A extração de texto (custosa) só acontece se o Gemini falhar.
 */

export type ResultadoExtracao = {
  fatura: ParsedInvoice;
  /** Qual provedor entregou o resultado — útil para diagnóstico e telemetria. */
  provedor: "gemini" | "groq";
  /** Preenchido quando o primário falhou e o fallback assumiu. */
  avisoFallback?: string;
};

export async function extrairFatura(pdfBytes: Uint8Array): Promise<ResultadoExtracao> {
  let erroGemini: string | null = null;

  if (geminiEstaConfigurado()) {
    try {
      const fatura = await parseFaturaComGemini(pdfBytes);
      if (fatura) {
        // Registrado também no sucesso: o fallback é silencioso e muda o modo de
        // leitura (PDF nativo vs. texto extraído), então sem esta linha não há
        // como saber pelos logs qual caminho processou cada fatura.
        console.info(`[Extrator] Fatura lida pelo Gemini — ${fatura.transactions.length} transações.`);
        return { fatura, provedor: "gemini" };
      }
      erroGemini = "Gemini não retornou dados.";
    } catch (error) {
      erroGemini = error instanceof Error ? error.message : "erro desconhecido";
      console.error("[Extrator] Gemini falhou, tentando Groq:", erroGemini);
    }
  } else {
    erroGemini = "GEMINI_API_KEY não configurada.";
    console.warn("[Extrator] Gemini não configurado — usando Groq.");
  }

  // Fallback: extrai o texto do PDF e usa o pipeline Groq.
  const { extractText } = await import("unpdf");
  const { text: pages } = await extractText(pdfBytes, { mergePages: true });
  const texto = Array.isArray(pages) ? pages.join("\n") : String(pages);

  if (!texto.trim()) {
    throw new Error(
      `Não foi possível ler este PDF. O Gemini falhou (${erroGemini}) e o arquivo não contém texto extraível — ` +
        `provavelmente é um PDF escaneado, que só o Gemini consegue processar.`
    );
  }

  const fatura = await parseFaturaComGroq(texto);
  if (!fatura) throw new Error(`Falha na extração. Gemini: ${erroGemini}. Groq não retornou dados.`);

  console.warn(`[Extrator] Fatura lida pela Groq (fallback) — ${fatura.transactions.length} transações.`);

  return {
    fatura,
    provedor: "groq",
    avisoFallback: erroGemini ? `Processado pela Groq — Gemini indisponível (${erroGemini}).` : undefined,
  };
}
