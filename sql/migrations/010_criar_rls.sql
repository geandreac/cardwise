-- ARQUIVO: 010_criar_rls.sql
-- DESCRIÇÃO: Row Level Security — ativo em todas as 7 tabelas
-- ROLLBACK: ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY; (e assim por diante)

-- ──────────────────────────────────────────────
-- Helper function: retorna o profile_id do usuário atual
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ──────────────────────────────────────────────
-- PROFILES
-- ──────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: select own" ON public.profiles;
CREATE POLICY "profiles: select own" ON public.profiles
  FOR SELECT USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "profiles: insert own" ON public.profiles;
CREATE POLICY "profiles: insert own" ON public.profiles
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;
CREATE POLICY "profiles: update own" ON public.profiles
  FOR UPDATE USING (auth_user_id = auth.uid());

-- ──────────────────────────────────────────────
-- CATEGORIES
-- ──────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories: all own" ON public.categories;
CREATE POLICY "categories: all own" ON public.categories
  FOR ALL USING (profile_id = get_my_profile_id());

-- ──────────────────────────────────────────────
-- CARDS
-- ──────────────────────────────────────────────
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cards: all own" ON public.cards;
CREATE POLICY "cards: all own" ON public.cards
  FOR ALL USING (profile_id = get_my_profile_id());

-- ──────────────────────────────────────────────
-- INVOICES
-- ──────────────────────────────────────────────
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices: all own" ON public.invoices;
CREATE POLICY "invoices: all own" ON public.invoices
  FOR ALL USING (
    card_id IN (
      SELECT id FROM public.cards WHERE profile_id = get_my_profile_id()
    )
  );

-- ──────────────────────────────────────────────
-- TRANSACTIONS
-- ──────────────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions: all own" ON public.transactions;
CREATE POLICY "transactions: all own" ON public.transactions
  FOR ALL USING (
    card_id IN (
      SELECT id FROM public.cards WHERE profile_id = get_my_profile_id()
    )
  );

-- ──────────────────────────────────────────────
-- ALERTS
-- ──────────────────────────────────────────────
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts: all own" ON public.alerts;
CREATE POLICY "alerts: all own" ON public.alerts
  FOR ALL USING (profile_id = get_my_profile_id());

-- ──────────────────────────────────────────────
-- CONSENTS
-- ──────────────────────────────────────────────
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consents: all own" ON public.consents;
CREATE POLICY "consents: all own" ON public.consents
  FOR ALL USING (profile_id = get_my_profile_id());