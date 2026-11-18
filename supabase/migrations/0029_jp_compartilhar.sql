-- ============================================
-- LIFE · JP — link de acompanhamento (sem login, somente leitura)
-- Cada família pode ter um link secreto (/convidados/<token>) que mostra
-- só o resumo e a lista do JP. Gerar um novo link invalida o anterior.
-- ============================================

create table if not exists jp_compartilhamento (
  familia_id uuid primary key default minha_familia_id() references familias(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  criado_em timestamptz default now()
);

alter table jp_compartilhamento enable row level security;
drop policy if exists "familia_select" on jp_compartilhamento;
drop policy if exists "familia_insert" on jp_compartilhamento;
drop policy if exists "familia_update" on jp_compartilhamento;
drop policy if exists "familia_delete" on jp_compartilhamento;
create policy "familia_select" on jp_compartilhamento for select using (familia_id = minha_familia_id());
create policy "familia_insert" on jp_compartilhamento for insert with check (familia_id = minha_familia_id());
create policy "familia_update" on jp_compartilhamento for update using (familia_id = minha_familia_id()) with check (familia_id = minha_familia_id());
create policy "familia_delete" on jp_compartilhamento for delete using (familia_id = minha_familia_id());

-- Lista pública: só devolve dados se o token existir; não expõe mais nada da família.
create or replace function jp_lista_publica(p_token text)
returns table (convite text, nome text, enviado boolean, resposta text, ordem int)
language sql
stable
security definer
set search_path = public
as $$
  select c.convite, c.nome, c.enviado, c.resposta, c.ordem
  from jp_convidados c
  join jp_compartilhamento s on s.familia_id = c.familia_id
  where length(coalesce(p_token, '')) >= 20 and s.token = p_token
  order by c.ordem, c.criado_em;
$$;

revoke all on function jp_lista_publica(text) from public;
grant execute on function jp_lista_publica(text) to anon, authenticated;
