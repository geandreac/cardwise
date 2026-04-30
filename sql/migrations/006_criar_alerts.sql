-- ARQUIVO: 006_criar_alerts.sql
-- DESCRIÇÃO: Alertas automáticos gerados pelas regras de negócio (RN04)
-- ROLLBACK: DROP TABLE IF EXISTS public.alerts CASCADE;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'danger');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text NOT NULL,                 -- 'limit_warning' | 'invoice_due' etc
  severity    alert_severity NOT NULL DEFAULT 'info',
  message     text NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}',
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_profile_unread
  ON public.alerts(profile_id, created_at DESC) WHERE is_read = false;

COMMENT ON COLUMN public.alerts.type IS
  'Valores: limit_warning | invoice_due | unusual_spending | unused_subscription | ai_insight';
COMMENT ON COLUMN public.alerts.metadata IS
  'JSON livre para dados extras. Ex: {"card_id": "...", "percentage": 87}';