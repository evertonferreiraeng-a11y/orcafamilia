-- ============================================
-- LIFE · JP — lista de compras do evento
-- Item, categoria, quantidade, valor unitário previsto, valor pago,
-- se já foi comprado, onde e quem comprou.
-- ============================================

create table if not exists jp_compras (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null default minha_familia_id() references familias(id) on delete cascade,
  item text not null,
  categoria text not null default 'Outros',
  quantidade numeric(12,3) not null default 1,
  unidade text not null default 'un',
  valor_unitario numeric(12,2) not null default 0,
  valor_pago numeric(12,2),
  comprado boolean not null default false,
  loja text,
  responsavel text,
  obs text,
  ordem int not null default 0,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  constraint jp_compras_valores_check check (quantidade >= 0 and valor_unitario >= 0 and (valor_pago is null or valor_pago >= 0))
);
create index if not exists jp_compras_familia_idx on jp_compras (familia_id, categoria, ordem);

drop trigger if exists jp_compras_atualizado on jp_compras;
create trigger jp_compras_atualizado before update on jp_compras
for each row execute function jp_tocar_atualizado();

alter table jp_compras enable row level security;
drop policy if exists "familia_select" on jp_compras;
drop policy if exists "familia_insert" on jp_compras;
drop policy if exists "familia_update" on jp_compras;
drop policy if exists "familia_delete" on jp_compras;
create policy "familia_select" on jp_compras for select using (familia_id = minha_familia_id());
create policy "familia_insert" on jp_compras for insert with check (familia_id = minha_familia_id());
create policy "familia_update" on jp_compras for update using (familia_id = minha_familia_id()) with check (familia_id = minha_familia_id());
create policy "familia_delete" on jp_compras for delete using (familia_id = minha_familia_id());
