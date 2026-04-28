// Configurações globais do app
// Feature flags, limites e timeouts

export const CONFIG = {
  // Paginação
  TRANSACOES_POR_PAGINA: 30,
  HISTORICO_RELATORIOS: 10,

  // Alertas (RN04)
  LIMITE_ALERTA_CRITICO: 85,   // % do limite do cartão
  LIMITE_ALERTA_ATENCAO: 60,   // % — badge amarelo
  DIAS_ALERTA_FATURA: 5,       // dias antes do vencimento

  // Projeção (RN03)
  MESES_HISTORICO_IDEAL: 3,
  FATOR_SEM_HISTORICO: 1.30,
  INTERVALO_MIN: 0.85,
  INTERVALO_MAX: 1.15,

  // Gastos incomuns (RN04)
  FATOR_GASTO_INCOMUM: 1.30,   // > 130% da média = alerta

  // Debounce
  DEBOUNCE_BUSCA_MS: 300,

  // Upload PDF
  PDF_MAX_SIZE_MB: 10,
  PDF_ACCEPTED_TYPES: ["application/pdf"],

  // Feature flags
  FEATURES: {
    IA_PDF_PARSER: false,      // ativa na Fase 4
    GOOGLE_OAUTH: true,
    MAGIC_LINK: true,
  },
} as const;