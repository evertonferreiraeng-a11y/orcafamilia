-- ============================================
-- TRANSACOES: referência à dívida que originou a parcela
-- (permite reaproveitar a parcela pendente ao registrar um pagamento,
-- em vez de criar uma transação nova e "escondida")
-- ============================================
alter table transacoes add column if not exists divida_id uuid references dividas(id) on delete set null;

create index if not exists idx_transacoes_divida_id on transacoes(divida_id);
