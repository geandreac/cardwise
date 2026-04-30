-- ARQUIVO: 003_criar_cards.sql
-- DESCRIÇÃO: Cartões de crédito do usuário
-- ROLLBACK: DROP TABLE IF EXISTS public.cards CASCADE;

-- Enum para bandeiras de cartão
DO $$ BEGIN
  CREATE TYPE card_brand AS ENUM (
    'visa', 'mastercard', 'elo', 'amex', 'hipercard', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum para tema visual do cartão
DO $$ BEGIN
  CREATE TYPE card_theme AS ENUM ('blue', 'green', 'graphite', 'purple');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.cards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname      text NOT NULL,
  brand         card_brand NOT NULL DEFAULT 'other',
  last_four     char(4) NOT NULL,
  holder_name   text NOT NULL,
  credit_limit  numeric(12,2) NOT NULL DEFAULT 0,
  due_day       integer NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  closing_day   integer NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  theme_color   card_theme NOT NULL DEFAULT 'blue',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_profile_id_active
  ON public.cards(profile_id) WHERE is_active = true;

COMMENT ON COLUMN public.cards.last_four IS
  'Apenas os 4 últimos dígitos. PCI-DSS: nunca armazenar número completo.';
COMMENT ON COLUMN public.cards.credit_limit IS
  'Limite de crédito em BRL. Usado para calcular % de uso (RN04).';