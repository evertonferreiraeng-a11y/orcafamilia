-- ============================================
-- METAS: adiciona campo de descrição
-- ============================================
alter table metas add column if not exists descricao text;
