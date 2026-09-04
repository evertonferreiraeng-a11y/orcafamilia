-- ============================================
-- COFRES: senha opcional para acessar o saldo/detalhes de um cofre
-- ============================================
alter table cofres add column if not exists senha_hash text;
