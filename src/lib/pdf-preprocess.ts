/**
 * Pré-processamento do texto bruto do PDF antes de enviar ao LLM.
 *
 * Faturas de cartão trazem muito conteúdo irrelevante (avisos legais, SAC,
 * publicidade, explicações de rotativo, QR code, endereços). Enviar tudo:
 *   - estoura o limite de tokens por minuto da Groq;
 *   - custa mais; e
 *   - piora a extração, porque dá ao modelo texto com números que não são
 *     transações.
 *
 * Esta função mantém apenas o cabeçalho e as linhas que contêm valores
 * monetários ou palavras-chave de fatura. Reduz tipicamente 60–80% do texto.
 */

/** Valor no formato brasileiro: 1.234,56 / 99,90 */
const REGEX_VALOR = /\d{1,3}(?:\.\d{3})*,\d{2}/;

/** Data no formato dd/mm ou dd/mm/aaaa, ou "02 ABR" */
const REGEX_DATA = /\b\d{2}\/\d{2}(?:\/\d{2,4})?\b|\b\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\b/i;

/** Palavras que marcam linhas estruturais da fatura (cabeçalho, totais, seções). */
const PALAVRAS_RELEVANTES =
  /vencimento|fechamento|per[íi]odo|total\s+(?:da\s+fatura|a\s+pagar)|limite|fatura\s+anterior|compras?\s+(?:nacionai|internacionai|parcelada)|encargos|iof|banco|cart[ãa]o\s+final|saldo/i;

/** Linhas que são claramente ruído — descartadas mesmo se tiverem números. */
const PALAVRAS_RUIDO =
  /ouvidoria|deficiente\s+auditiv|c[óo]digo\s+de\s+barras|autoatendimento|www\.|https?:|\.com\.br|cnpj|central\s+de\s+atendimento|sac\b|capitais\s+e\s+regi|demais\s+localidades|reclama[çc][õo]es|banco\s+central|resolu[çc][ãa]o\s+n|pol[íi]tica\s+de\s+privacidade|termos\s+de\s+uso|preserve\s+o\s+meio\s+ambiente/i;

export type ResultadoPreprocessamento = {
  /** Texto reduzido, pronto para o LLM. */
  texto: string;
  /** Primeiras linhas com dados de cabeçalho (banco, vencimento, total). */
  cabecalho: string;
  /** Linhas candidatas a transação (têm data e valor). */
  linhasTransacao: string[];
  charsOriginais: number;
  charsFinais: number;
};

export function reduzirTextoFatura(textoBruto: string): ResultadoPreprocessamento {
  const linhas = textoBruto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s{2,}/g, "  ").trim())
    .filter((l) => l.length > 0);

  const mantidas: string[] = [];
  const linhasTransacao: string[] = [];
  let anterior = "";

  linhas.forEach((linha, i) => {
    if (linha === anterior) return; // colapsa repetições consecutivas
    anterior = linha;

    const temValor = REGEX_VALOR.test(linha);
    const temData = REGEX_DATA.test(linha);
    const ehCabecalho = i < 25;
    const ehRelevante = PALAVRAS_RELEVANTES.test(linha);

    if (PALAVRAS_RUIDO.test(linha) && !(temValor && temData)) return;

    if (temValor || ehRelevante || ehCabecalho) {
      mantidas.push(linha);
      if (temValor && temData) linhasTransacao.push(linha);
    }
  });

  const texto = mantidas.join("\n");

  return {
    texto,
    cabecalho: mantidas.slice(0, 30).join("\n"),
    linhasTransacao,
    charsOriginais: textoBruto.length,
    charsFinais: texto.length,
  };
}

/**
 * Estimativa de tokens para português (~3.2 caracteres por token).
 * Usada para dimensionar as chamadas dentro do limite de TPM da Groq.
 */
export function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / 3.2);
}
