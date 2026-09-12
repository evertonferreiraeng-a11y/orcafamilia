-- ============================================
-- DIVIDAS: permite cadastrar dívida sem vencimento definido (apenas radar),
-- situação de acompanhamento (ativa/standby) e observações livres
-- ============================================
alter table dividas alter column data_vencimento drop not null;

alter table dividas add column if not exists sem_vencimento boolean not null default false;

alter table dividas add column if not exists situacao text not null default 'ativa';
alter table dividas add constraint dividas_situacao_check check (situacao in ('ativa', 'standby'));

alter table dividas add column if not exists observacoes text;
