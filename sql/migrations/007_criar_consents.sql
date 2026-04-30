-- ARQUIVO: 007_criar_consents.sql
-- DESCRIÇÃO: Histórico de consentimentos LGPD (Art. 7º, Lei 13.709/2018)
-- ROLLBACK: DROP TABLE IF EXISTS public.consents CASCADE;

CREATE TABLE IF NOT EXISTS public.consents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text NOT NULL,                 -- 'terms' | 'privacy' | 'marketing'
  version     text NOT NULL,                -- ex: 'v1.0'
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address  text,
  user_agent  text
);

CREATE INDEX IF NOT EXISTS idx_consents_profile_id
  ON public.consents(profile_id);

COMMENT ON TABLE public.consents IS
  'Registro imutável de consentimentos. Direito de acesso via tela Perfil (Art. 18 LGPD).';