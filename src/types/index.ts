// ============================================
// CARDWISE — Interfaces de Domínio
// Zero dependências externas — TypeScript puro
// ============================================

// --- Perfil do usuário ---
export interface IProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  avatar_url: string | null;
  currency: string;
  monthly_limit: number | null;
  created_at: string;
  updated_at: string;
}

// --- Cartão de crédito ---
export type CardBrand = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "other";
export type CardTheme = "blue" | "green" | "graphite" | "purple";

export interface ICard {
  id: string;
  profile_id: string;
  nickname: string;
  brand: CardBrand;
  last_four: string;       // sempre 4 dígitos
  holder_name: string;
  credit_limit: number;
  due_day: number;         // 1-31
  closing_day: number;     // 1-31
  due_next_month: boolean;
  theme_color: CardTheme;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Fatura ---
export type InvoiceStatus = "open" | "closed" | "paid" | "overdue";

export interface IInvoice {
  id: string;
  card_id: string;
  reference_month: string; // formato: YYYY-MM-01
  due_date: string;
  closing_date: string;
  total_amount: number;    // desnormalizado via trigger
  status: InvoiceStatus;
  pdf_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Transação ---
export interface ITransaction {
  id: string;
  invoice_id: string | null;
  card_id: string;
  category_id: string | null;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  competence_date: string;
  buyer_id: string | null;
  installment_info: string | null; // ex: "1/12"
  is_recurring: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

// --- Categoria ---
export interface ICategory {
  id: string;
  profile_id: string;
  name: string;
  color: string;
  emoji: string;
  is_default: boolean;
}

// --- Alerta ---
export type AlertSeverity = "info" | "warning" | "danger";
export type AlertType =
  | "limit_warning"
  | "invoice_due"
  | "unusual_spending"
  | "unused_subscription"
  | "ai_insight";

export interface IAlert {
  id: string;
  profile_id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// --- Consentimento LGPD ---
export type ConsentType = "terms" | "privacy" | "marketing";

export interface IConsent {
  id: string;
  profile_id: string;
  type: ConsentType;
  version: string;
  accepted_at: string;
  ip_address: string;
  user_agent: string;
}

// --- Resposta padrão da API ---
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// --- Projeção de gastos (RN03) ---
export interface IProjecao {
  valor_projetado: number;
  intervalo_min: number;   // projecao × 0.85
  intervalo_max: number;   // projecao × 1.15
  meses_historico: number;
  gasto_atual: number;
}