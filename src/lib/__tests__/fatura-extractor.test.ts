import { describe, it, expect } from "vitest";
import { gerarPdfDeTexto } from "./helpers/pdf-fake";
import { carregarEnvLocal } from "./helpers/env";

carregarEnvLocal();

/** Testes que gastam cota de API só rodam se houver alguma chave configurada. */
const temAlgumaChave = Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);

const LINHAS_FATURA = [
  "BANCO EXEMPLO S.A. - Fatura do Cartao Final 1234",
  "Vencimento: 10/05/2026",
  "Periodo vigente: 31 Mar a 30 Abr 2026",
  "Total da Fatura: R$ 1.450,90",
  "Central de Atendimento 4004-0000 - Ouvidoria 0800 111 1111",
  "www.bancoexemplo.com.br - CNPJ 00.000.000/0001-00",
  "COMPRAS NACIONAIS",
  "02/04  SUPERMERCADO BOM PRECO  250,00",
  "05/04  POSTO IPIRANGA CENTRO  180,50",
  "COMPRAS PARCELADAS",
  "19/12  LOJA MOVEIS CASA PARC 02/03  320,40",
  "20/03  FARMACIA SAO JOAO PARC 05/05  99,90",
  "PAGAMENTOS",
  "15/04  PAGAMENTO EFETUADO  -900,00",
  "ENCARGOS",
  "30/04  IOF  12,20",
];

describe("gerarPdfDeTexto", () => {
  it("produz um PDF que o unpdf consegue ler", async () => {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(gerarPdfDeTexto(LINHAS_FATURA), { mergePages: true });
    const texto = Array.isArray(text) ? text.join("\n") : String(text);

    expect(texto).toContain("SUPERMERCADO BOM PRECO");
    expect(texto).toContain("PARC 02/03");
    expect(texto).toContain("Total da Fatura");
  }, 30_000);
});

describe("mensagemDeErroGemini", () => {
  it("extrai a mensagem legível do JSON de erro do Google", async () => {
    const { mensagemDeErroGemini } = await import("../gemini-parse");

    const erroDoSdk = new Error(
      JSON.stringify({
        error: {
          code: 400,
          message: "API key not valid. Please pass a valid API key.",
          details: [{ reason: "API_KEY_INVALID" }],
        },
      })
    );

    expect(mensagemDeErroGemini(erroDoSdk)).toBe(
      "API key not valid. Please pass a valid API key. (API_KEY_INVALID)"
    );
  });

  it("passa adiante mensagens que não são JSON", async () => {
    const { mensagemDeErroGemini } = await import("../gemini-parse");
    expect(mensagemDeErroGemini(new Error("timeout de rede"))).toBe("timeout de rede");
  });

  it("trunca mensagens muito longas", async () => {
    const { mensagemDeErroGemini } = await import("../gemini-parse");
    const longa = mensagemDeErroGemini(new Error("x".repeat(500)));
    expect(longa.length).toBeLessThanOrEqual(301);
    expect(longa.endsWith("…")).toBe(true);
  });
});

describe.skipIf(!temAlgumaChave)("extrairFatura (integração — consome cota de API)", () => {
  it("extrai a fatura e informa qual provedor respondeu", async () => {
    const { extrairFatura } = await import("../fatura-extractor");
    const r = await extrairFatura(gerarPdfDeTexto(LINHAS_FATURA));

    expect(["gemini", "groq"]).toContain(r.provedor);

    // Regra de ouro do sistema: o denominador da parcela é copiado, nunca recalculado.
    const moveis = r.fatura.transactions.find((t) =>
      t.description.toUpperCase().includes("MOVEIS")
    );
    expect(moveis?.installment_info).toBe("2/3");

    const farmacia = r.fatura.transactions.find((t) =>
      t.description.toUpperCase().includes("FARMACIA")
    );
    expect(farmacia?.installment_info).toBe("5/5");

    // Pagamentos não são débitos e não podem entrar na lista.
    const pagamento = r.fatura.transactions.find((t) =>
      t.description.toUpperCase().includes("PAGAMENTO EFETUADO")
    );
    expect(pagamento).toBeUndefined();

    // A descrição alimenta o fingerprint de deduplicação, então precisa ser o
    // nome puro do estabelecimento nos DOIS provedores. Se um deles deixar o
    // "PARC 02/03" grudado, a mesma compra vira duas transações no banco.
    for (const tx of r.fatura.transactions) {
      expect(tx.description).not.toMatch(/PARC\s*\d+\/\d+/i);
    }
    expect(moveis?.description).toBe("LOJA MOVEIS CASA");
  }, 180_000);
});

describe("normalizarParcela", () => {
  it("remove zeros à esquerda para gravar sempre no mesmo formato", async () => {
    const { normalizarParcela } = await import("../gemini-parse");
    expect(normalizarParcela("02/03")).toBe("2/3");
    expect(normalizarParcela("2/3")).toBe("2/3");
    expect(normalizarParcela(" 06/12 ")).toBe("6/12");
  });

  it("trata ausência de parcela como null", async () => {
    const { normalizarParcela } = await import("../gemini-parse");
    expect(normalizarParcela("")).toBeNull();
    expect(normalizarParcela(null)).toBeNull();
    expect(normalizarParcela(undefined)).toBeNull();
    expect(normalizarParcela("0/0")).toBeNull();
  });
});
