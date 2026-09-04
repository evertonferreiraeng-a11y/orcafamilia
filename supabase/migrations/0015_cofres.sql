-- ============================================
-- COFRES: reservas de dinheiro guardado por projeto/objetivo,
-- com histórico de depósitos e retiradas
-- ============================================
create table cofres (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  nome text not null,
  descricao text,
  cor text,
  saldo numeric(12,2) not null default 0,
  criado_em timestamptz default now()
);

create table cofre_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  cofre_id uuid references cofres(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  tipo text not null check (tipo in ('deposito', 'retirada')),
  valor numeric(12,2) not null,
  descricao text,
  data date not null,
  criado_em timestamptz default now()
);

alter table cofres enable row level security;

create policy "ver_familia" on cofres for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on cofres for insert
with check (user_id = auth.uid());

create policy "atualizar_proprio" on cofres for update
using (user_id = auth.uid());

create policy "excluir_proprio" on cofres for delete
using (user_id = auth.uid());

alter table cofre_movimentacoes enable row level security;

create policy "ver_familia" on cofre_movimentacoes for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on cofre_movimentacoes for insert
with check (user_id = auth.uid());

create policy "excluir_proprio" on cofre_movimentacoes for delete
using (user_id = auth.uid());
