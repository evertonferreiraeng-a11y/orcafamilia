-- ============================================
-- SUBCATEGORIAS
-- ============================================
create table subcategorias (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references categorias(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  nome text not null,
  criado_em timestamptz default now()
);

alter table subcategorias enable row level security;

create policy "ver_familia" on subcategorias for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on subcategorias for insert
with check (user_id = auth.uid());

create policy "atualizar_proprio" on subcategorias for update
using (user_id = auth.uid());

create policy "excluir_proprio" on subcategorias for delete
using (user_id = auth.uid());

-- ============================================
-- TRANSACOES: novos campos
-- ============================================

-- categoria_id vira opcional: transferências entre contas não têm categoria
alter table transacoes alter column categoria_id drop not null;

alter table transacoes add column if not exists subcategoria_id uuid references subcategorias(id) on delete set null;

-- status de pagamento (default true preserva o comportamento das linhas já existentes)
alter table transacoes add column if not exists pago boolean not null default true;

-- transferência entre contas: duas linhas (uma saída, uma entrada) ligadas por grupo_transferencia
alter table transacoes add column if not exists eh_transferencia boolean not null default false;
alter table transacoes add column if not exists grupo_transferencia uuid;

-- parcelamento/recorrência materializada: N linhas reais ligadas por grupo_parcelamento
alter table transacoes add column if not exists grupo_parcelamento uuid;
alter table transacoes add column if not exists parcela_atual int;
alter table transacoes add column if not exists parcela_total int;

create index if not exists idx_transacoes_grupo_transferencia on transacoes(grupo_transferencia);
create index if not exists idx_transacoes_grupo_parcelamento on transacoes(grupo_parcelamento);
