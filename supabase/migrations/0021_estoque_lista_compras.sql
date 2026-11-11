-- ============================================
-- LIFE · ESTOQUE · LISTA DE COMPRAS MANUAL
-- A família monta a lista (inclui/exclui itens). Cada item pode ser um
-- produto do estoque (meta, atual e status vêm do cadastro) ou um item
-- livre digitado. Cada item tem uma observação.
-- ============================================

create table if not exists estoque_lista (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null default minha_familia_id() references familias(id) on delete cascade,
  produto_id uuid references estoque_produtos(id) on delete cascade,
  nome text,                                   -- item livre (quando não é produto do estoque)
  obs text,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz default now(),
  constraint estoque_lista_item_check check (produto_id is not null or nullif(trim(nome), '') is not null)
);
-- o mesmo produto não entra duas vezes na lista
create unique index if not exists estoque_lista_produto_uk on estoque_lista (familia_id, produto_id) where produto_id is not null;
create unique index if not exists estoque_lista_nome_uk on estoque_lista (familia_id, lower(trim(nome))) where produto_id is null;

alter table estoque_lista enable row level security;
drop policy if exists "familia_select" on estoque_lista;
drop policy if exists "familia_insert" on estoque_lista;
drop policy if exists "familia_update" on estoque_lista;
drop policy if exists "familia_delete" on estoque_lista;
create policy "familia_select" on estoque_lista for select using (familia_id = minha_familia_id());
create policy "familia_insert" on estoque_lista for insert with check (familia_id = minha_familia_id());
create policy "familia_update" on estoque_lista for update using (familia_id = minha_familia_id()) with check (familia_id = minha_familia_id());
create policy "familia_delete" on estoque_lista for delete using (familia_id = minha_familia_id());

grant select, insert, update, delete on estoque_lista to authenticated;
