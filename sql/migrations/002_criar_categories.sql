-- ARQUIVO: 002_criar_categories.sql
-- DESCRIÇÃO: Categorias de gastos por perfil (6 padrão + customizadas)
-- ROLLBACK: DROP TABLE IF EXISTS public.categories CASCADE;

CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#64748b',
  emoji       text NOT NULL DEFAULT '📦',
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_profile_id
  ON public.categories(profile_id);

COMMENT ON COLUMN public.categories.is_default IS
  'Categorias padrão não podem ser excluídas (RN07). Criadas via trigger handle_new_user.';