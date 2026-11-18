-- ============================================
-- LIFE · APP JP
-- Lista de convidados: cada pessoa pertence a um convite (família/grupo),
-- com telefone, se o convite já foi enviado e a resposta (sim / não / pendente).
--
-- Tudo isolado por familia_id (RLS via minha_familia_id()).
-- ============================================

create table if not exists jp_convidados (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null default minha_familia_id() references familias(id) on delete cascade,
  convite text not null default '',
  nome text not null,
  telefone text,
  enviado boolean not null default false,
  resposta text not null default 'pendente',
  obs text,
  ordem int not null default 0,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  constraint jp_convidados_resposta_check check (resposta in ('sim', 'nao', 'pendente'))
);
create index if not exists jp_convidados_familia_idx on jp_convidados (familia_id, ordem);

create or replace function jp_tocar_atualizado()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists jp_convidados_atualizado on jp_convidados;
create trigger jp_convidados_atualizado before update on jp_convidados
for each row execute function jp_tocar_atualizado();

-- RLS: todos os membros da família leem e editam a lista
alter table jp_convidados enable row level security;
drop policy if exists "familia_select" on jp_convidados;
drop policy if exists "familia_insert" on jp_convidados;
drop policy if exists "familia_update" on jp_convidados;
drop policy if exists "familia_delete" on jp_convidados;
create policy "familia_select" on jp_convidados for select using (familia_id = minha_familia_id());
create policy "familia_insert" on jp_convidados for insert with check (familia_id = minha_familia_id());
create policy "familia_update" on jp_convidados for update using (familia_id = minha_familia_id()) with check (familia_id = minha_familia_id());
create policy "familia_delete" on jp_convidados for delete using (familia_id = minha_familia_id());
