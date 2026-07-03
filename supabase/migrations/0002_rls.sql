-- ============================================
-- FUNÇÕES AUXILIARES (SECURITY DEFINER — evita recursão de RLS)
-- ============================================
create or replace function minha_familia_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select familia_id from familia_membros where user_id = auth.uid() limit 1;
$$;

create or replace function membros_da_familia()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select fm2.user_id
  from familia_membros fm1
  join familia_membros fm2 on fm1.familia_id = fm2.familia_id
  where fm1.user_id = auth.uid();
$$;

-- ============================================
-- FAMILIAS
-- (leitura liberada para autenticados: necessário para validar código de
-- convite no cadastro; não expõe dados sensíveis, apenas id/nome)
-- ============================================
alter table familias enable row level security;

create policy "ver_familias" on familias for select
using (auth.role() = 'authenticated');

create policy "criar_familia" on familias for insert
with check (auth.role() = 'authenticated');

-- ============================================
-- FAMILIA_MEMBROS
-- ============================================
alter table familia_membros enable row level security;

create policy "ver_membros_familia" on familia_membros for select
using (
  user_id = auth.uid()
  or familia_id = minha_familia_id()
);

create policy "entrar_familia" on familia_membros for insert
with check (user_id = auth.uid());

-- ============================================
-- PERFIS (somente o próprio usuário)
-- ============================================
alter table perfis enable row level security;

create policy "ver_proprio_perfil" on perfis for select
using (id = auth.uid());

create policy "criar_proprio_perfil" on perfis for insert
with check (id = auth.uid());

create policy "atualizar_proprio_perfil" on perfis for update
using (id = auth.uid());

-- ============================================
-- CONTAS
-- ============================================
alter table contas enable row level security;

create policy "ver_familia" on contas for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on contas for insert
with check (user_id = auth.uid());

create policy "atualizar_proprio" on contas for update
using (user_id = auth.uid());

create policy "excluir_proprio" on contas for delete
using (user_id = auth.uid());

-- ============================================
-- CARTOES
-- ============================================
alter table cartoes enable row level security;

create policy "ver_familia" on cartoes for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on cartoes for insert
with check (user_id = auth.uid());

create policy "atualizar_proprio" on cartoes for update
using (user_id = auth.uid());

create policy "excluir_proprio" on cartoes for delete
using (user_id = auth.uid());

-- ============================================
-- CATEGORIAS
-- ============================================
alter table categorias enable row level security;

create policy "ver_familia" on categorias for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on categorias for insert
with check (user_id = auth.uid());

create policy "atualizar_proprio" on categorias for update
using (user_id = auth.uid());

create policy "excluir_proprio" on categorias for delete
using (user_id = auth.uid());

-- ============================================
-- TRANSACOES
-- ============================================
alter table transacoes enable row level security;

create policy "ver_familia" on transacoes for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on transacoes for insert
with check (user_id = auth.uid());

create policy "atualizar_proprio" on transacoes for update
using (user_id = auth.uid());

create policy "excluir_proprio" on transacoes for delete
using (user_id = auth.uid());

-- ============================================
-- ORCAMENTOS
-- ============================================
alter table orcamentos enable row level security;

create policy "ver_familia" on orcamentos for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on orcamentos for insert
with check (user_id = auth.uid());

create policy "atualizar_proprio" on orcamentos for update
using (user_id = auth.uid());

create policy "excluir_proprio" on orcamentos for delete
using (user_id = auth.uid());

-- ============================================
-- DIVIDAS
-- ============================================
alter table dividas enable row level security;

create policy "ver_familia" on dividas for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on dividas for insert
with check (user_id = auth.uid());

create policy "atualizar_proprio" on dividas for update
using (user_id = auth.uid());

create policy "excluir_proprio" on dividas for delete
using (user_id = auth.uid());

-- ============================================
-- METAS
-- ============================================
alter table metas enable row level security;

create policy "ver_familia" on metas for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on metas for insert
with check (user_id = auth.uid());

create policy "atualizar_proprio" on metas for update
using (user_id = auth.uid());

create policy "excluir_proprio" on metas for delete
using (user_id = auth.uid());

-- ============================================
-- INVESTIMENTOS
-- ============================================
alter table investimentos enable row level security;

create policy "ver_familia" on investimentos for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on investimentos for insert
with check (user_id = auth.uid());

create policy "atualizar_proprio" on investimentos for update
using (user_id = auth.uid());

create policy "excluir_proprio" on investimentos for delete
using (user_id = auth.uid());

-- ============================================
-- ALERTAS_CONFIG (somente o próprio usuário)
-- ============================================
alter table alertas_config enable row level security;

create policy "ver_proprio" on alertas_config for select
using (user_id = auth.uid());

create policy "criar_proprio" on alertas_config for insert
with check (user_id = auth.uid());

create policy "atualizar_proprio" on alertas_config for update
using (user_id = auth.uid());

-- ============================================
-- NOTIFICACOES_LOG (somente o próprio usuário; escrita apenas via
-- service role a partir da Edge Function)
-- ============================================
alter table notificacoes_log enable row level security;

create policy "ver_proprio" on notificacoes_log for select
using (user_id = auth.uid());
