-- ARQUIVO: 009_criar_indices.sql
-- DESCRIÇÃO: Índices adicionais de performance (complementa os das migrations anteriores)
-- Todos já criados inline nas migrations 001-007.
-- Este arquivo serve para índices que dependem de múltiplas tabelas.

-- Índice composto para dashboard: buscar transações recentes de todos os cartões do perfil
CREATE INDEX IF NOT EXISTS idx_transactions_card_date_merchant
  ON public.transactions(card_id, transaction_date DESC, merchant_name);

-- Índice para projeções: agregação por mês
CREATE INDEX IF NOT EXISTS idx_transactions_date_trunc
  ON public.transactions(date_trunc('month', transaction_date));

COMMENT ON INDEX idx_transactions_date_trunc IS
  'Acelera o cálculo de projeções (RN03) que agrega por mês.';