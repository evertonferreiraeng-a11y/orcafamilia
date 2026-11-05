-- ============================================
-- GESTÃO DE ESTOQUE FAMILIAR – RESERVA 180 DIAS
-- Módulo de estoque de emergência (alimentos, água e itens do bebê),
-- compartilhado por todos os membros da família.
--
-- Todas as tabelas são isoladas por familia_id (RLS via minha_familia_id()).
-- As operações que mexem em quantidades (entrada, saída FEFO, estorno e
-- ajuste) são feitas por funções no banco, para serem atômicas.
-- ============================================

-- ---------- CONFIGURAÇÃO (1 linha por família) ----------
create table if not exists estoque_config (
  familia_id uuid primary key default minha_familia_id() references familias(id) on delete cascade,
  orc_min numeric(12,2) not null default 300,
  orc_max numeric(12,2) not null default 500,
  composicao text default '2 adultos e 1 bebê',
  atualizado_em timestamptz default now(),
  constraint estoque_config_orc_check check (orc_min >= 0 and orc_max > 0 and orc_min <= orc_max)
);

-- ---------- LOCAIS DE ARMAZENAMENTO ----------
create table if not exists estoque_locais (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null default minha_familia_id() references familias(id) on delete cascade,
  nome text not null,
  umidade text not null default 'Adequada',
  temperatura text not null default 'Ambiente',
  sol text not null default 'Sem exposição',
  embalagem text not null default 'Íntegra',
  inspecao date,
  obs text,
  criado_em timestamptz default now()
);
create unique index if not exists estoque_locais_nome_uk on estoque_locais (familia_id, lower(nome));

-- ---------- PRODUTOS ----------
create table if not exists estoque_produtos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null default minha_familia_id() references familias(id) on delete cascade,
  nome text not null,
  categoria text not null,
  tipo text not null default 'alimento',
  unidade text not null,
  meta numeric(14,3) not null default 0,
  minimo numeric(14,3) not null default 0,
  preco_ref numeric(12,2) not null default 0,
  cap numeric(10,3),                       -- capacidade padrão da embalagem (água, em litros)
  local_id uuid references estoque_locais(id) on delete set null,
  obs text,
  criado_em timestamptz default now(),
  constraint estoque_produtos_tipo_check check (tipo in ('alimento', 'agua', 'bebe')),
  constraint estoque_produtos_meta_check check (meta >= 0 and minimo >= 0 and preco_ref >= 0)
);
create unique index if not exists estoque_produtos_nome_uk on estoque_produtos (familia_id, lower(nome));

-- ---------- LOTES (cada compra gera um lote; validade controlada por lote) ----------
create table if not exists estoque_lotes (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null default minha_familia_id() references familias(id) on delete cascade,
  produto_id uuid not null references estoque_produtos(id) on delete cascade,
  qtd_inicial numeric(14,3) not null default 0,
  qtd_atual numeric(14,3) not null default 0,
  data_compra date not null default current_date,
  data_fab date,
  validade date,
  num_lote text,
  valor numeric(12,2) not null default 0,  -- valor total pago pelo lote
  fornecedor text,
  local_id uuid references estoque_locais(id) on delete set null,
  cap numeric(10,3),                       -- litros por embalagem (água)
  obs text,
  saldo_negativo boolean not null default false,
  criado_em timestamptz default now()
);
create index if not exists estoque_lotes_produto_idx on estoque_lotes (produto_id, validade);

-- ---------- MOVIMENTAÇÕES (histórico completo) ----------
create table if not exists estoque_movs (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null default minha_familia_id() references familias(id) on delete cascade,
  grupo uuid not null default gen_random_uuid(),
  data date not null default current_date,
  tipo text not null,
  produto_id uuid not null references estoque_produtos(id) on delete cascade,
  lote_id uuid references estoque_lotes(id) on delete set null,
  qtd numeric(14,3) not null,              -- positivo; em 'ajuste' é a diferença (+/-)
  valor numeric(12,2) not null default 0,
  obs text,
  estornado boolean not null default false,
  estornado_em timestamptz,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz default now(),
  constraint estoque_movs_tipo_check check (tipo in ('entrada', 'reposicao', 'consumo', 'perda', 'danificado', 'descarte', 'ajuste'))
);
create index if not exists estoque_movs_familia_data_idx on estoque_movs (familia_id, data desc);
create index if not exists estoque_movs_produto_idx on estoque_movs (produto_id);

-- ============================================
-- RLS: todos os membros da família leem e editam o estoque da família
-- ============================================
do $$
declare t text;
begin
  foreach t in array array['estoque_config', 'estoque_locais', 'estoque_produtos', 'estoque_lotes', 'estoque_movs'] loop
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
-- FUNÇÕES (security invoker: respeitam a RLS do usuário)
-- ============================================

create or replace function estoque_familia_obrigatoria()
returns uuid
language plpgsql
stable
as $$
declare v uuid;
begin
  v := minha_familia_id();
  if v is null then
    raise exception 'SEM_FAMILIA' using hint = 'O usuário não pertence a nenhuma família.';
  end if;
  return v;
end;
$$;

-- Cadastro inicial (idempotente): locais, 15 produtos com metas e a fórmula infantil
create or replace function estoque_inicializar()
returns boolean
language plpgsql
as $$
declare
  v_fam uuid := estoque_familia_obrigatoria();
  v_local uuid;
begin
  -- só semeia na primeira vez (quando a configuração da família ainda não existia)
  insert into estoque_config (familia_id) values (v_fam) on conflict (familia_id) do nothing;
  if not found then return false; end if;
  if exists (select 1 from estoque_produtos where familia_id = v_fam) or exists (select 1 from estoque_locais where familia_id = v_fam) then
    return false;
  end if;

  insert into estoque_locais (familia_id, nome)
  values (v_fam, 'Despensa'), (v_fam, 'Armário'), (v_fam, 'Prateleiras'), (v_fam, 'Caixas organizadoras'), (v_fam, 'Outros locais');
  select id into v_local from estoque_locais where familia_id = v_fam and nome = 'Despensa';

  insert into estoque_produtos (familia_id, nome, categoria, unidade, meta, minimo, preco_ref, tipo, cap, local_id, obs)
  select v_fam, x.nome, x.categoria, x.unidade, x.meta, ceil(x.meta * 0.3 * 10) / 10, x.preco, x.tipo, x.cap, v_local, x.obs
  from (values
    ('Arroz', 'Grãos e cereais', 'kg', 40::numeric, 6::numeric, 'alimento', null::numeric, null::text),
    ('Feijão carioca/preto', 'Grãos e cereais', 'kg', 18, 8, 'alimento', null, null),
    ('Macarrão', 'Massas', 'kg', 15, 8, 'alimento', null, null),
    ('Farinha de trigo', 'Farinhas', 'kg', 5, 6, 'alimento', null, null),
    ('Fubá', 'Farinhas', 'kg', 5, 5, 'alimento', null, null),
    ('Farinha de mandioca', 'Farinhas', 'kg', 4, 9, 'alimento', null, null),
    ('Aveia', 'Grãos e cereais', 'kg', 4, 14, 'alimento', null, null),
    ('Açúcar', 'Básicos', 'kg', 5, 5, 'alimento', null, null),
    ('Sal', 'Básicos', 'kg', 1, 3, 'alimento', null, null),
    ('Óleo de soja', 'Óleos', 'litros', 12, 8, 'alimento', null, null),
    ('Leite em pó integral', 'Laticínios', 'kg', 3, 45, 'alimento', null, null),
    ('Amendoim sem sal', 'Oleaginosas', 'kg', 4, 20, 'alimento', null, null),
    ('Sardinha em conserva', 'Proteínas', 'latas', 24, 7, 'alimento', null, null),
    ('Molho de tomate', 'Molhos e conservas', 'sachês', 24, 3, 'alimento', null, null),
    ('Água mineral sem gás', 'Água', 'litros', 150, 2, 'agua', 5, 'Meta: 30 garrafas de 5 litros.'),
    ('Fórmula infantil', 'Bebê', 'latas', 0, 0, 'bebe', null, 'Controle separado. Defina a meta, a marca e o tipo de fórmula conforme a orientação do pediatra.')
  ) as x(nome, categoria, unidade, meta, preco, tipo, cap, obs);
  return true;
end;
$$;

-- Entrada (compra ou reposição): cria um lote e registra a movimentação
create or replace function estoque_entrada(
  p_produto uuid,
  p_qtd numeric,
  p_data_compra date,
  p_validade date default null,
  p_data_fab date default null,
  p_num_lote text default null,
  p_valor numeric default 0,
  p_fornecedor text default null,
  p_local uuid default null,
  p_cap numeric default null,
  p_obs text default null,
  p_tipo text default 'entrada'
)
returns uuid
language plpgsql
as $$
declare
  v_fam uuid := estoque_familia_obrigatoria();
  v_lote uuid;
begin
  if not exists (select 1 from estoque_produtos where id = p_produto and familia_id = v_fam) then
    raise exception 'PRODUTO_INVALIDO';
  end if;
  if p_qtd is null or p_qtd <= 0 then raise exception 'QUANTIDADE_INVALIDA'; end if;
  if p_tipo not in ('entrada', 'reposicao') then raise exception 'TIPO_INVALIDO'; end if;
  if p_data_fab is not null and p_validade is not null and p_validade <= p_data_fab then raise exception 'VALIDADE_ANTES_FABRICACAO'; end if;

  insert into estoque_lotes (familia_id, produto_id, qtd_inicial, qtd_atual, data_compra, data_fab, validade, num_lote, valor, fornecedor, local_id, cap, obs)
  values (v_fam, p_produto, round(p_qtd, 3), round(p_qtd, 3), coalesce(p_data_compra, current_date), p_data_fab, p_validade,
          nullif(trim(p_num_lote), ''), round(coalesce(p_valor, 0), 2), nullif(trim(p_fornecedor), ''), p_local, p_cap, nullif(trim(p_obs), ''))
  returning id into v_lote;

  insert into estoque_movs (familia_id, data, tipo, produto_id, lote_id, qtd, valor, obs)
  values (v_fam, coalesce(p_data_compra, current_date), p_tipo, p_produto, v_lote, round(p_qtd, 3), round(coalesce(p_valor, 0), 2), nullif(trim(p_obs), ''));

  return v_lote;
end;
$$;

-- Saída (consumo, perda, danificado, descarte) com FEFO: primeiro a vencer, primeiro a sair.
-- Consumo nunca usa lotes vencidos (a não ser que o lote seja escolhido).
-- Se faltar saldo: erro ESTOQUE_INSUFICIENTE, salvo quando p_permitir_negativo = true
-- (confirmação explícita do usuário), caso em que o excedente vai para um lote "SALDO NEGATIVO".
create or replace function estoque_saida(
  p_produto uuid,
  p_qtd numeric,
  p_tipo text,
  p_data date default current_date,
  p_obs text default null,
  p_lote uuid default null,
  p_permitir_negativo boolean default false
)
returns jsonb
language plpgsql
as $$
declare
  v_fam uuid := estoque_familia_obrigatoria();
  v_grupo uuid := gen_random_uuid();
  v_rest numeric := round(p_qtd, 3);
  v_disp numeric := 0;
  v_t numeric;
  v_neg uuid;
  r record;
begin
  if p_tipo not in ('consumo', 'perda', 'danificado', 'descarte') then raise exception 'TIPO_INVALIDO'; end if;
  if p_qtd is null or p_qtd <= 0 then raise exception 'QUANTIDADE_INVALIDA'; end if;
  if not exists (select 1 from estoque_produtos where id = p_produto and familia_id = v_fam) then raise exception 'PRODUTO_INVALIDO'; end if;
  if p_lote is not null and not exists (select 1 from estoque_lotes where id = p_lote and produto_id = p_produto) then raise exception 'LOTE_INVALIDO'; end if;

  for r in
    select * from estoque_lotes
    where produto_id = p_produto and familia_id = v_fam and qtd_atual > 0
      and (p_lote is null or id = p_lote)
      and (p_lote is not null or p_tipo <> 'consumo' or validade is null or validade >= current_date)
    order by coalesce(validade, date '9999-12-31'), data_compra, criado_em
    for update
  loop
    v_disp := v_disp + r.qtd_atual;
    exit when v_rest <= 0;
    v_t := least(v_rest, r.qtd_atual);
    update estoque_lotes set qtd_atual = round(qtd_atual - v_t, 3) where id = r.id;
    insert into estoque_movs (familia_id, grupo, data, tipo, produto_id, lote_id, qtd, valor, obs)
    values (v_fam, v_grupo, p_data, p_tipo, p_produto, r.id, v_t,
            round(v_t * case when r.qtd_inicial > 0 and r.valor > 0 then r.valor / r.qtd_inicial else 0 end, 2), nullif(trim(p_obs), ''));
    v_rest := round(v_rest - v_t, 3);
  end loop;

  if v_rest > 0 then
    if not coalesce(p_permitir_negativo, false) then
      raise exception 'ESTOQUE_INSUFICIENTE' using detail = json_build_object('disponivel', v_disp, 'falta', v_rest)::text;
    end if;
    if p_lote is not null then
      v_neg := p_lote;
    else
      select id into v_neg from estoque_lotes where produto_id = p_produto and saldo_negativo limit 1 for update;
      if v_neg is null then
        insert into estoque_lotes (familia_id, produto_id, qtd_inicial, qtd_atual, data_compra, num_lote, saldo_negativo, obs)
        values (v_fam, p_produto, 0, 0, p_data, 'SALDO NEGATIVO', true,
                'Saída registrada acima do estoque, confirmada pelo usuário. Corrija com uma entrada ou ajuste de inventário.')
        returning id into v_neg;
      end if;
    end if;
    update estoque_lotes set qtd_atual = round(qtd_atual - v_rest, 3) where id = v_neg;
    insert into estoque_movs (familia_id, grupo, data, tipo, produto_id, lote_id, qtd, valor, obs)
    values (v_fam, v_grupo, p_data, p_tipo, p_produto, v_neg, v_rest, 0, trim('[sem saldo – confirmado] ' || coalesce(p_obs, '')));
  end if;

  return jsonb_build_object('grupo', v_grupo, 'falta', v_rest);
end;
$$;

-- Estorno: desfaz a movimentação e mantém o registro (riscado) no histórico
create or replace function estoque_estornar(p_mov uuid)
returns void
language plpgsql
as $$
declare
  v_fam uuid := estoque_familia_obrigatoria();
  m estoque_movs;
  l estoque_lotes;
begin
  select * into m from estoque_movs where id = p_mov and familia_id = v_fam for update;
  if not found or m.estornado then raise exception 'MOV_INVALIDA'; end if;
  select * into l from estoque_lotes where id = m.lote_id for update;

  if m.tipo in ('entrada', 'reposicao') then
    if l.id is not null then
      if l.qtd_atual <> l.qtd_inicial then raise exception 'LOTE_COM_SAIDAS'; end if;
      delete from estoque_lotes where id = l.id;
    end if;
  else
    if l.id is null then raise exception 'LOTE_INEXISTENTE'; end if;
    if m.tipo = 'ajuste' then
      update estoque_lotes set qtd_atual = round(qtd_atual - m.qtd, 3) where id = l.id;
    else
      update estoque_lotes set qtd_atual = round(qtd_atual + m.qtd, 3) where id = l.id;
      if l.saldo_negativo and round(l.qtd_atual + m.qtd, 3) = 0 then
        update estoque_movs set lote_id = null where lote_id = l.id;
        delete from estoque_lotes where id = l.id;
      end if;
    end if;
  end if;

  update estoque_movs set estornado = true, estornado_em = now() where id = p_mov;
end;
$$;

-- Edição de lote + ajuste de inventário pela contagem (gera movimentação 'ajuste')
create or replace function estoque_atualizar_lote(
  p_lote uuid,
  p_contagem numeric,
  p_data_compra date,
  p_validade date default null,
  p_data_fab date default null,
  p_num_lote text default null,
  p_valor numeric default 0,
  p_fornecedor text default null,
  p_local uuid default null,
  p_obs text default null
)
returns void
language plpgsql
as $$
declare
  v_fam uuid := estoque_familia_obrigatoria();
  l estoque_lotes;
  v_diff numeric;
  v_unit numeric;
begin
  select * into l from estoque_lotes where id = p_lote and familia_id = v_fam for update;
  if not found then raise exception 'LOTE_INVALIDO'; end if;
  if p_contagem is null or (p_contagem < 0 and not l.saldo_negativo) then raise exception 'QUANTIDADE_INVALIDA'; end if;
  if p_data_fab is not null and p_validade is not null and p_validade <= p_data_fab then raise exception 'VALIDADE_ANTES_FABRICACAO'; end if;

  update estoque_lotes set
    data_compra = coalesce(p_data_compra, data_compra), validade = p_validade, data_fab = p_data_fab,
    num_lote = nullif(trim(p_num_lote), ''), valor = round(coalesce(p_valor, 0), 2),
    fornecedor = nullif(trim(p_fornecedor), ''), local_id = p_local, obs = nullif(trim(p_obs), '')
  where id = p_lote;

  update estoque_movs set valor = round(coalesce(p_valor, 0), 2), data = coalesce(p_data_compra, data)
  where lote_id = p_lote and tipo in ('entrada', 'reposicao') and not estornado;

  v_diff := round(p_contagem - l.qtd_atual, 3);
  if v_diff <> 0 then
    v_unit := case when l.qtd_inicial > 0 and coalesce(p_valor, 0) > 0 then p_valor / l.qtd_inicial else 0 end;
    update estoque_lotes set qtd_atual = round(p_contagem, 3) where id = p_lote;
    insert into estoque_movs (familia_id, data, tipo, produto_id, lote_id, qtd, valor, obs)
    values (v_fam, current_date, 'ajuste', l.produto_id, p_lote, v_diff, round(v_diff * v_unit, 2), 'Ajuste por contagem de inventário');
  end if;
end;
$$;

-- Importa o backup (.json) da versão offline (arquivo HTML) para a família.
-- Substitui os dados de estoque atuais da família.
create or replace function estoque_importar_backup(p_dados jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_fam uuid := estoque_familia_obrigatoria();
  d jsonb := coalesce(p_dados -> 'dados', p_dados);
  x jsonb;
  v_id uuid;
  n_p int := 0; n_l int := 0; n_m int := 0;
begin
  if jsonb_typeof(d -> 'produtos') <> 'array' or jsonb_typeof(d -> 'lotes') <> 'array' or jsonb_typeof(d -> 'movs') <> 'array' then
    raise exception 'BACKUP_INVALIDO';
  end if;

  create temp table if not exists _map (velho text primary key, novo uuid) on commit drop;
  delete from _map;

  delete from estoque_movs where familia_id = v_fam;
  delete from estoque_lotes where familia_id = v_fam;
  delete from estoque_produtos where familia_id = v_fam;
  delete from estoque_locais where familia_id = v_fam;

  insert into estoque_config (familia_id, orc_min, orc_max, composicao)
  values (v_fam, coalesce((d #>> '{config,orcMin}')::numeric, 300), coalesce((d #>> '{config,orcMax}')::numeric, 500), d #>> '{config,familia}')
  on conflict (familia_id) do update set orc_min = excluded.orc_min, orc_max = excluded.orc_max, composicao = excluded.composicao, atualizado_em = now();

  for x in select * from jsonb_array_elements(coalesce(d -> 'locais', '[]'::jsonb)) loop
    insert into estoque_locais (familia_id, nome, umidade, temperatura, sol, embalagem, inspecao, obs)
    values (v_fam, x ->> 'nome', coalesce(x ->> 'umidade', 'Adequada'), coalesce(x ->> 'temperatura', 'Ambiente'), coalesce(x ->> 'sol', 'Sem exposição'),
            coalesce(x ->> 'embalagem', 'Íntegra'), nullif(x ->> 'inspecao', '')::date, nullif(x ->> 'obs', ''))
    returning id into v_id;
    insert into _map values ('L:' || (x ->> 'id'), v_id);
  end loop;

  for x in select * from jsonb_array_elements(d -> 'produtos') loop
    insert into estoque_produtos (familia_id, nome, categoria, tipo, unidade, meta, minimo, preco_ref, cap, local_id, obs)
    values (v_fam, x ->> 'nome', coalesce(nullif(x ->> 'categoria', ''), 'Sem categoria'), coalesce(x ->> 'tipo', 'alimento'), coalesce(nullif(x ->> 'unidade', ''), 'unidades'),
            coalesce((x ->> 'meta')::numeric, 0), coalesce((x ->> 'minimo')::numeric, 0), coalesce((x ->> 'precoRef')::numeric, 0),
            nullif(x ->> 'cap', '')::numeric, (select novo from _map where velho = 'L:' || (x ->> 'localId')), nullif(x ->> 'obs', ''))
    returning id into v_id;
    insert into _map values ('P:' || (x ->> 'id'), v_id);
    n_p := n_p + 1;
  end loop;

  for x in select * from jsonb_array_elements(d -> 'lotes') loop
    insert into estoque_lotes (familia_id, produto_id, qtd_inicial, qtd_atual, data_compra, data_fab, validade, num_lote, valor, fornecedor, local_id, cap, obs, saldo_negativo)
    select v_fam, mp.novo, coalesce((x ->> 'qtdInicial')::numeric, 0), coalesce((x ->> 'qtdAtual')::numeric, 0),
           coalesce(nullif(x ->> 'dataCompra', '')::date, current_date), nullif(x ->> 'dataFab', '')::date, nullif(x ->> 'validade', '')::date,
           nullif(x ->> 'numLote', ''), coalesce((x ->> 'valor')::numeric, 0), nullif(x ->> 'fornecedor', ''),
           (select novo from _map where velho = 'L:' || (x ->> 'localId')), nullif(x ->> 'cap', '')::numeric, nullif(x ->> 'obs', ''),
           coalesce((x ->> 'saldoNegativo')::boolean, false)
    from _map mp where mp.velho = 'P:' || (x ->> 'produtoId')
    returning id into v_id;
    if v_id is not null then insert into _map values ('T:' || (x ->> 'id'), v_id); n_l := n_l + 1; end if;
    v_id := null;
  end loop;

  for x in select * from jsonb_array_elements(d -> 'movs') loop
    insert into estoque_movs (familia_id, data, tipo, produto_id, lote_id, qtd, valor, obs, estornado, estornado_em)
    select v_fam, coalesce(nullif(x ->> 'data', '')::date, current_date), x ->> 'tipo', mp.novo,
           (select novo from _map where velho = 'T:' || (x ->> 'loteId')), coalesce((x ->> 'qtd')::numeric, 0), coalesce((x ->> 'valor')::numeric, 0),
           nullif(x ->> 'obs', ''), coalesce((x ->> 'estornado')::boolean, false), nullif(x ->> 'estornadoEm', '')::timestamptz
    from _map mp where mp.velho = 'P:' || (x ->> 'produtoId');
    if found then n_m := n_m + 1; end if;
  end loop;

  return jsonb_build_object('produtos', n_p, 'lotes', n_l, 'movs', n_m);
end;
$$;

grant select, insert, update, delete on estoque_config, estoque_locais, estoque_produtos, estoque_lotes, estoque_movs to authenticated;
grant execute on function
  estoque_familia_obrigatoria(), estoque_inicializar(),
  estoque_entrada(uuid, numeric, date, date, date, text, numeric, text, uuid, numeric, text, text),
  estoque_saida(uuid, numeric, text, date, text, uuid, boolean),
  estoque_estornar(uuid),
  estoque_atualizar_lote(uuid, numeric, date, date, date, text, numeric, text, uuid, text),
  estoque_importar_backup(jsonb)
to authenticated;
