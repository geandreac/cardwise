// Todas as rotas do app em um único lugar
// Uso: import { ROTAS } from "@/constants/rotas"
// Nunca hardcodar strings de rota nos componentes

export const ROTAS = {
  AUTH:         "/auth",
  DASHBOARD:    "/dashboard",
  CARTOES:      "/dashboard/cartoes",
  FATURAS:      "/dashboard/faturas",
  TRANSACOES:   "/dashboard/transacoes",
  ANALISE:      "/dashboard/analise",
  PROJECOES:    "/dashboard/projecoes",
  RELATORIOS:   "/dashboard/relatorios",
  PERFIL:       "/dashboard/perfil",
  AUTH_CALLBACK: "/api/auth/callback",
} as const;

export type Rota = (typeof ROTAS)[keyof typeof ROTAS];