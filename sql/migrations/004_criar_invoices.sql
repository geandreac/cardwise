-- ARQUIVO: 004_criar_invoices.sql
-- DESCRIÇÃO: Faturas mensais por cartão
-- ROLLBACK: DROP TABLE IF EXISTS public.invoices CASCADE;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('open', 'closed', 'paid', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id           uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  reference_month   date NOT NULL,           -- sempre dia 01: 2024-04-01
  due_date          date NOT NULL,
  closing_date      date NOT NULL,
  total_amount      numeric(12,2) NOT NULL DEFAULT 0,
  status            invoice_status NOT NULL DEFAULT 'open',
  pdf_url           text,
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- 1 fatura por mês por cartão (RN02)
  UNIQUE (card_id, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_invoices_card_month
  ON public.invoices(card_id, reference_month DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_status_pending
  ON public.invoices(status) WHERE status IN ('closed', 'overdue');

COMMENT ON COLUMN public.invoices.total_amount IS
  'Desnormalizado intencionalmente para performance. Mantido via trigger update_invoice_total.';
COMMENT ON COLUMN public.invoices.status IS
  'UNIDIRECIONAL: open→closed→paid ou overdue. Nunca retrocede (RN02).';