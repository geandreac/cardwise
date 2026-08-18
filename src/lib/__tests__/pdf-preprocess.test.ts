import { describe, it, expect } from "vitest";
import { reduzirTextoFatura, estimarTokens } from "../pdf-preprocess";

const RUIDO = `
Central de Atendimento 4004-0000 capitais e regioes metropolitanas
SAC 0800 000 0000 - Ouvidoria 0800 111 1111
Atendimento ao deficiente auditivo 0800 222 2222
www.bancoexemplo.com.br - CNPJ 00.000.000/0001-00
Conforme Resolucao n 4.549 do Banco Central, o pagamento minimo e de 15,00%.
Codigo de barras: 03399.12345 67890.123456 78901.234567 8 90120000145090
`.trim();

const FATURA = `BANCO EXEMPLO S.A. - Fatura do Cartao Final 1234
Vencimento: 10/05/2026
Periodo vigente: 31 Mar a 30 Abr 2026
Total da Fatura: R$ 1.450,90
${RUIDO}
COMPRAS NACIONAIS
02/04  SUPERMERCADO BOM PRECO  250,00
19/12  LOJA MOVEIS CASA PARC 02/03  320,40
${RUIDO}
30/04  IOF  12,20`;

describe("reduzirTextoFatura", () => {
  it("preserva cabeçalho, totais e linhas de transação", () => {
    const { texto } = reduzirTextoFatura(FATURA);

    expect(texto).toContain("Vencimento: 10/05/2026");
    expect(texto).toContain("Total da Fatura");
    expect(texto).toContain("SUPERMERCADO BOM PRECO  250,00");
    expect(texto).toContain("LOJA MOVEIS CASA PARC 02/03");
    expect(texto).toContain("IOF  12,20");
  });

  it("descarta boilerplate que gasta tokens sem informar nada", () => {
    const { texto } = reduzirTextoFatura(FATURA);

    expect(texto).not.toContain("Ouvidoria");
    expect(texto).not.toContain("www.bancoexemplo.com.br");
    expect(texto).not.toContain("Codigo de barras");
  });

  it("identifica as linhas candidatas a transação", () => {
    const { linhasTransacao } = reduzirTextoFatura(FATURA);

    // 02/04, 19/12 e 30/04 — as três linhas com data E valor.
    expect(linhasTransacao).toHaveLength(3);
  });

  it("reduz significativamente o volume de texto", () => {
    const { charsOriginais, charsFinais } = reduzirTextoFatura(FATURA);
    expect(charsFinais).toBeLessThan(charsOriginais * 0.75);
  });

  it("não quebra com texto vazio", () => {
    const r = reduzirTextoFatura("");
    expect(r.texto).toBe("");
    expect(r.linhasTransacao).toHaveLength(0);
  });
});

describe("estimarTokens", () => {
  it("aproxima o número de tokens pelo tamanho do texto", () => {
    expect(estimarTokens("")).toBe(0);
    expect(estimarTokens("a".repeat(320))).toBe(100);
  });
});
