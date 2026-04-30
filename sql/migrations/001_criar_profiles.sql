-- ARQUIVO: 001_criar_profiles.sql
-- DESCRIÇÃO: Tabela de perfis vinculada ao auth.users
-- ROLLBACK: DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text NOT NULL DEFAULT '',
  avatar_url      text,
  currency        text NOT NULL DEFAULT 'BRL',
  monthly_limit   numeric(12,2),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Índice para lookup por auth_user_id (usado em todo o RLS)
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id
  ON public.profiles(auth_user_id);

COMMENT ON TABLE public.profiles IS
  'Perfil público do usuário — criado automaticamente via trigger handle_new_user';
COMMENT ON COLUMN public.profiles.monthly_limit IS
  'Limite mensal global configurado pelo usuário. NULL = sem limite definido.';