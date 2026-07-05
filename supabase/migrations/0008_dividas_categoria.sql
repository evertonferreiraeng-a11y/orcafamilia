-- ============================================
-- DIVIDAS: categoria usada para gerar a transação automática de pagamento
-- ============================================
alter table dividas add column if not exists categoria_id uuid references categorias(id) on delete set null;
