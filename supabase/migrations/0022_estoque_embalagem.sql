-- ============================================
-- LIFE · ESTOQUE · CONTEÚDO DA EMBALAGEM
-- Guarda quanto vem em cada embalagem (ex.: sachê de 340 g, pacote de 1 kg):
--  - no produto: embalagem padrão (pré-preenche a entrada)
--  - no lote: a embalagem daquela compra
-- ============================================

alter table estoque_produtos add column if not exists emb_conteudo numeric(12,3);
alter table estoque_produtos add column if not exists emb_unidade text;
alter table estoque_lotes add column if not exists emb_conteudo numeric(12,3);
alter table estoque_lotes add column if not exists emb_unidade text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'estoque_produtos_emb_check') then
    alter table estoque_produtos add constraint estoque_produtos_emb_check
      check ((emb_conteudo is null and emb_unidade is null) or (emb_conteudo > 0 and emb_unidade in ('g', 'kg', 'ml', 'L')));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'estoque_lotes_emb_check') then
    alter table estoque_lotes add constraint estoque_lotes_emb_check
      check ((emb_conteudo is null and emb_unidade is null) or (emb_conteudo > 0 and emb_unidade in ('g', 'kg', 'ml', 'L')));
  end if;
end $$;

-- Nova versão da entrada, com o conteúdo da embalagem (substitui a da migração 0019)
drop function if exists estoque_entrada(uuid, numeric, date, date, date, text, numeric, text, uuid, numeric, text, text);

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
  p_tipo text default 'entrada',
  p_emb_conteudo numeric default null,
  p_emb_unidade text default null
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
  if (p_emb_conteudo is null) <> (p_emb_unidade is null) or (p_emb_conteudo is not null and (p_emb_conteudo <= 0 or p_emb_unidade not in ('g', 'kg', 'ml', 'L'))) then
    raise exception 'EMBALAGEM_INVALIDA';
  end if;

  insert into estoque_lotes (familia_id, produto_id, qtd_inicial, qtd_atual, data_compra, data_fab, validade, num_lote, valor, fornecedor, local_id, cap, obs, emb_conteudo, emb_unidade)
  values (v_fam, p_produto, round(p_qtd, 3), round(p_qtd, 3), coalesce(p_data_compra, current_date), p_data_fab, p_validade,
          nullif(trim(p_num_lote), ''), round(coalesce(p_valor, 0), 2), nullif(trim(p_fornecedor), ''), p_local, p_cap, nullif(trim(p_obs), ''),
          round(p_emb_conteudo, 3), p_emb_unidade)
  returning id into v_lote;

  insert into estoque_movs (familia_id, data, tipo, produto_id, lote_id, qtd, valor, obs)
  values (v_fam, coalesce(p_data_compra, current_date), p_tipo, p_produto, v_lote, round(p_qtd, 3), round(coalesce(p_valor, 0), 2), nullif(trim(p_obs), ''));

  return v_lote;
end;
$$;

grant execute on function estoque_entrada(uuid, numeric, date, date, date, text, numeric, text, uuid, numeric, text, text, numeric, text) to authenticated;
