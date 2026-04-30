-- ARQUIVO: 008_criar_triggers.sql
-- DESCRIÇÃO: Triggers automáticos do sistema
-- ROLLBACK: DROP FUNCTION IF EXISTS handle_new_user CASCADE;
--           DROP FUNCTION IF EXISTS update_invoice_total CASCADE;
--           DROP FUNCTION IF EXISTS set_updated_at CASCADE;

-- ──────────────────────────────────────────────
-- TRIGGER 1: Criar perfil + categorias padrão
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_profile_id uuid;
BEGIN
  -- Cria o perfil
  INSERT INTO public.profiles (auth_user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  RETURNING id INTO new_profile_id;

  -- Insere as 6 categorias padrão
  INSERT INTO public.categories (profile_id, name, color, emoji, is_default)
  VALUES
    (new_profile_id, 'Alimentação',  '#8b5cf6', '🍔', true),
    (new_profile_id, 'Transporte',   '#3b82f6', '🚗', true),
    (new_profile_id, 'Assinaturas',  '#06b6d4', '📱', true),
    (new_profile_id, 'Saúde',        '#f59e0b', '💊', true),
    (new_profile_id, 'Lazer',        '#f87171', '🎮', true),
    (new_profile_id, 'Outros',       '#64748b', '📦', true);

  RETURN NEW;
END;
$$;

-- Aplica o trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────
-- TRIGGER 2: Recalcular total da fatura (RN01)
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_invoice_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_invoice_id uuid;
BEGIN
  -- Determina qual fatura foi afetada
  target_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  IF target_invoice_id IS NOT NULL THEN
    UPDATE public.invoices
    SET
      total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.transactions
        WHERE invoice_id = target_invoice_id
      ),
      updated_at = now()
    WHERE id = target_invoice_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_transaction_changed ON public.transactions;
CREATE TRIGGER on_transaction_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_total();

-- ──────────────────────────────────────────────
-- TRIGGER 3: Atualizar updated_at automaticamente
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Aplica em todas as tabelas com updated_at
DO $$ BEGIN
  DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
  CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS set_cards_updated_at ON public.cards;
  CREATE TRIGGER set_cards_updated_at
    BEFORE UPDATE ON public.cards
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS set_invoices_updated_at ON public.invoices;
  CREATE TRIGGER set_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
  CREATE TRIGGER set_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END $$;