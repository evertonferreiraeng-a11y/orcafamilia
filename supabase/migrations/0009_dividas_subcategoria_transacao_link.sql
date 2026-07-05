-- ============================================
-- DIVIDAS: subcategoria usada junto da categoria na transação automática
-- ============================================
alter table dividas add column if not exists subcategoria_id uuid references subcategorias(id) on delete set null;

-- ============================================
-- TRANSACOES: referência ao pagamento de dívida que a originou
-- (permite reverter valor_pago/parcelas/vencimento se a transação for excluída)
-- ============================================
alter table transacoes add column if not exists pagamento_divida_id uuid references pagamentos_dividas(id) on delete set null;
