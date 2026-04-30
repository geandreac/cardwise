-- ARQUIVO: 005_criar_transactions.sql
-- DESCRIÇÃO: Transações individuais por fatura/cartão
-- ROLLBACK: DROP TABLE IF EXISTS public.transactions CASCADE;

CREATE TABLE IF NOT EXISTS public.transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  card_id           uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  category_id       uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  merchant_name     text NOT NULL,
  amount            numeric(12,2) NOT NULL CHECK (amount > 0),
  transaction_date  date NOT NULL,
  installment_info  text,                    -- ex: "3/12"
  is_recurring      boolean NOT NULL DEFAULT false,
  notes             text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id
  ON public.transactions(invoice_id);

CREATE INDEX IF NOT EXISTS idx_transactions_card_date
  ON public.transactions(card_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_category_id
  ON public.transactions(category_id);

COMMENT ON COLUMN public.transactions.invoice_id IS
  'Nullable: transação pode existir sem fatura vinculada (ex: lançamento avulso).';
COMMENT ON COLUMN public.transactions.installment_info IS
  'Formato: "N/TOTAL" ex: "1/12". Null = à vista. Ver RN05 para criação de parcelas.';