-- ============================================
-- LIFE · APP CASA
-- Manutenções periódicas da casa (filtro de água, ar-condicionado,
-- caixa d'água, etc.), itens/equipamentos com garantia, histórico de
-- execuções com custos e prestadores de serviço.
--
-- Tudo isolado por familia_id (RLS via minha_familia_id()).
-- Registrar/desfazer uma execução é feito por funções no banco (atômico).
-- ============================================

-- ---------- CONFIGURAÇÃO (1 linha por família; marca que o cadastro inicial já foi feito) ----------
create table if not exists casa_config (
  familia_id uuid primary key default minha_familia_id() references familias(id) on delete cascade,
  aviso_padrao int not null default 15,
  criado_em timestamptz default now(),
  constraint casa_config_aviso_check check (aviso_padrao >= 0)
);

-- ---------- PRESTADORES DE SERVIÇO ----------
create table if not exists casa_prestadores (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null default minha_familia_id() references familias(id) on delete cascade,
  nome text not null,
  servico text,
  telefone text,
  email text,
  obs text,
  criado_em timestamptz default now()
);
create unique index if not exists casa_prestadores_nome_uk on casa_prestadores (familia_id, lower(nome));

-- ---------- ITENS / EQUIPAMENTOS DA CASA ----------
create table if not exists casa_itens (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null default minha_familia_id() references familias(id) on delete cascade,
  nome text not null,
  categoria text not null default 'Outros',
  comodo text,
  marca text,
  modelo text,
  data_instalacao date,
  garantia_ate date,
  valor numeric(12,2) not null default 0,
  obs text,
  criado_em timestamptz default now(),
  constraint casa_itens_valor_check check (valor >= 0)
);

-- ---------- MANUTENÇÕES PROGRAMADAS (recorrentes) ----------
create table if not exists casa_tarefas (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null default minha_familia_id() references familias(id) on delete cascade,
  item_id uuid references casa_itens(id) on delete cascade,
  titulo text not null,
  categoria text not null default 'Outros',
  freq_valor int not null default 6,
  freq_unidade text not null default 'meses',
  ultima_execucao date,
  proxima_data date,
  aviso_dias int not null default 15,
  custo_estimado numeric(12,2) not null default 0,
  prestador_id uuid references casa_prestadores(id) on delete set null,
  instrucoes text,
  ativa boolean not null default true,
  criado_em timestamptz default now(),
  constraint casa_tarefas_freq_check check (freq_valor > 0 and freq_unidade in ('dias', 'semanas', 'meses', 'anos')),
  constraint casa_tarefas_aviso_check check (aviso_dias >= 0 and custo_estimado >= 0)
);
create index if not exists casa_tarefas_proxima_idx on casa_tarefas (familia_id, proxima_data);

-- ---------- HISTÓRICO DE EXECUÇÕES ----------
create table if not exists casa_execucoes (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null default minha_familia_id() references familias(id) on delete cascade,
  tarefa_id uuid not null references casa_tarefas(id) on delete cascade,
  data date not null default current_date,
  custo numeric(12,2) not null default 0,
  prestador_id uuid references casa_prestadores(id) on delete set null,
  obs text,
  -- datas da tarefa antes desta execução (para poder desfazer)
  ultima_anterior date,
  proxima_anterior date,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz default now(),
  constraint casa_execucoes_custo_check check (custo >= 0)
);
create index if not exists casa_execucoes_tarefa_idx on casa_execucoes (tarefa_id, data desc);
create index if not exists casa_execucoes_familia_data_idx on casa_execucoes (familia_id, data desc);

-- ============================================
-- RLS: todos os membros da família leem e editam os dados da casa
-- ============================================
do $$
declare t text;
begin
  foreach t in array array['casa_config', 'casa_prestadores', 'casa_itens', 'casa_tarefas', 'casa_execucoes'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "familia_select" on %I', t);
    execute format('drop policy if exists "familia_insert" on %I', t);
    execute format('drop policy if exists "familia_update" on %I', t);
    execute format('drop policy if exists "familia_delete" on %I', t);
    execute format('create policy "familia_select" on %I for select using (familia_id = minha_familia_id())', t);
    execute format('create policy "familia_insert" on %I for insert with check (familia_id = minha_familia_id())', t);
    execute format('create policy "familia_update" on %I for update using (familia_id = minha_familia_id()) with check (familia_id = minha_familia_id())', t);
    execute format('create policy "familia_delete" on %I for delete using (familia_id = minha_familia_id())', t);
  end loop;
end $$;

-- ============================================
-- FUNÇÕES
-- ============================================

-- Data + frequência (ex.: 2026-01-31 + 1 mês = 2026-02-28)
create or replace function casa_somar_periodo(p_data date, p_valor int, p_unidade text)
returns date
language sql
immutable
as $$
  select (p_data + case p_unidade
    when 'dias' then make_interval(days => p_valor)
    when 'semanas' then make_interval(weeks => p_valor)
    when 'meses' then make_interval(months => p_valor)
    else make_interval(years => p_valor)
  end)::date
$$;

-- Cadastro inicial (só na primeira vez da família)
create or replace function casa_inicializar()
returns boolean
language plpgsql
as $$
declare
  v_fam uuid := minha_familia_id();
  v_filtro uuid; v_ar uuid; v_caixa uuid; v_gordura uuid;
begin
  if v_fam is null then raise exception 'SEM_FAMILIA'; end if;
  insert into casa_config (familia_id) values (v_fam) on conflict (familia_id) do nothing;
  if not found then return false; end if;
  if exists (select 1 from casa_tarefas where familia_id = v_fam) or exists (select 1 from casa_itens where familia_id = v_fam) then
    return false;
  end if;

  insert into casa_itens (familia_id, nome, categoria, comodo) values (v_fam, 'Purificador / filtro de água', 'Água', 'Cozinha') returning id into v_filtro;
  insert into casa_itens (familia_id, nome, categoria, comodo) values (v_fam, 'Ar-condicionado', 'Climatização', null) returning id into v_ar;
  insert into casa_itens (familia_id, nome, categoria, comodo) values (v_fam, 'Caixa d''água', 'Hidráulica', 'Área externa') returning id into v_caixa;
  insert into casa_itens (familia_id, nome, categoria, comodo) values (v_fam, 'Caixa de gordura', 'Hidráulica', 'Área externa') returning id into v_gordura;

  insert into casa_tarefas (familia_id, item_id, titulo, categoria, freq_valor, freq_unidade, aviso_dias, instrucoes)
  values
    (v_fam, v_filtro, 'Trocar o refil do filtro de água', 'Água', 6, 'meses', 15, 'Confira no manual do purificador o prazo do refil (geralmente 6 meses ou por litros filtrados).'),
    (v_fam, v_ar, 'Limpar o filtro do ar-condicionado', 'Climatização', 1, 'meses', 5, 'Retire os filtros da unidade interna, lave com água e sabão neutro e deixe secar à sombra.'),
    (v_fam, v_ar, 'Higienização completa do ar-condicionado', 'Climatização', 6, 'meses', 15, 'Limpeza da serpentina, bandeja e dreno por profissional.'),
    (v_fam, v_caixa, 'Limpar e higienizar a caixa d''água', 'Hidráulica', 6, 'meses', 15, null),
    (v_fam, v_gordura, 'Limpar a caixa de gordura', 'Hidráulica', 3, 'meses', 10, null),
    (v_fam, null, 'Dedetização', 'Controle de pragas', 6, 'meses', 15, null),
    (v_fam, null, 'Limpar calhas e verificar o telhado', 'Telhado', 12, 'meses', 30, 'De preferência antes da temporada de chuvas.'),
    (v_fam, null, 'Revisar rejunte e silicone (box, pia, tanque)', 'Hidráulica', 12, 'meses', 30, null),
    (v_fam, null, 'Testar disjuntores e DR do quadro de luz', 'Elétrica', 12, 'meses', 30, 'Aperte o botão de teste do DR: a energia deve desligar.');
  return true;
end;
$$;

-- Registra que uma manutenção foi feita e calcula a próxima data.
-- Registro retroativo (data anterior à última execução) entra só no histórico.
create or replace function casa_registrar_execucao(
  p_tarefa uuid,
  p_data date,
  p_custo numeric default 0,
  p_prestador uuid default null,
  p_obs text default null,
  p_proxima date default null
)
returns uuid
language plpgsql
as $$
declare
  v_fam uuid := minha_familia_id();
  t casa_tarefas;
  v_id uuid;
begin
  if v_fam is null then raise exception 'SEM_FAMILIA'; end if;
  select * into t from casa_tarefas where id = p_tarefa and familia_id = v_fam for update;
  if not found then raise exception 'TAREFA_INVALIDA'; end if;
  if p_data is null or p_data > current_date then raise exception 'DATA_INVALIDA'; end if;
  if coalesce(p_custo, 0) < 0 then raise exception 'CUSTO_INVALIDO'; end if;
  if p_proxima is not null and p_proxima <= p_data then raise exception 'PROXIMA_INVALIDA'; end if;

  insert into casa_execucoes (familia_id, tarefa_id, data, custo, prestador_id, obs, ultima_anterior, proxima_anterior)
  values (v_fam, t.id, p_data, round(coalesce(p_custo, 0), 2), p_prestador, nullif(trim(p_obs), ''), t.ultima_execucao, t.proxima_data)
  returning id into v_id;

  if t.ultima_execucao is null or p_data >= t.ultima_execucao then
    update casa_tarefas
    set ultima_execucao = p_data,
        proxima_data = coalesce(p_proxima, casa_somar_periodo(p_data, t.freq_valor, t.freq_unidade)),
        prestador_id = coalesce(p_prestador, prestador_id)
    where id = t.id;
  end if;
  return v_id;
end;
$$;

-- Desfaz uma execução. Se ela era a mais recente, a tarefa volta às datas anteriores.
create or replace function casa_desfazer_execucao(p_exec uuid)
returns void
language plpgsql
as $$
declare
  v_fam uuid := minha_familia_id();
  e casa_execucoes;
  t casa_tarefas;
begin
  if v_fam is null then raise exception 'SEM_FAMILIA'; end if;
  select * into e from casa_execucoes where id = p_exec and familia_id = v_fam for update;
  if not found then raise exception 'EXECUCAO_INVALIDA'; end if;
  select * into t from casa_tarefas where id = e.tarefa_id for update;
  delete from casa_execucoes where id = e.id;

  if t.ultima_execucao = e.data and not exists (select 1 from casa_execucoes where tarefa_id = t.id and data >= e.data) then
    update casa_tarefas set ultima_execucao = e.ultima_anterior, proxima_data = e.proxima_anterior where id = t.id;
  end if;
end;
$$;

grant select, insert, update, delete on casa_config, casa_prestadores, casa_itens, casa_tarefas, casa_execucoes to authenticated;
grant execute on function
  casa_somar_periodo(date, int, text),
  casa_inicializar(),
  casa_registrar_execucao(uuid, date, numeric, uuid, text, date),
  casa_desfazer_execucao(uuid)
to authenticated;
