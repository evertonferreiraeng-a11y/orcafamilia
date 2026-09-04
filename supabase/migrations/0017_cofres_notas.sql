-- ============================================
-- COFRES: campo de anotações livres
-- ============================================
alter table cofres add column if not exists notas text;
