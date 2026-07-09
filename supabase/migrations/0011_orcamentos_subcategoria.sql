alter table orcamentos add column if not exists subcategoria_id uuid references subcategorias(id) on delete cascade;

alter table orcamentos drop constraint if exists orcamentos_user_id_categoria_id_mes_referencia_key;

create unique index if not exists orcamentos_categoria_unq
  on orcamentos(user_id, categoria_id, mes_referencia)
  where subcategoria_id is null;

create unique index if not exists orcamentos_subcategoria_unq
  on orcamentos(user_id, categoria_id, subcategoria_id, mes_referencia)
  where subcategoria_id is not null;
