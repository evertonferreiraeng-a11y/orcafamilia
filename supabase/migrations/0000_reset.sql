-- Script de reset: remove tudo que possa ter ficado de tentativas
-- anteriores das migrations, para permitir rodar 0001/0002 do zero.
-- Não afeta o schema auth.* do Supabase (usuários continuam existindo).

drop table if exists notificacoes_log cascade;
drop table if exists alertas_config cascade;
drop table if exists investimentos cascade;
drop table if exists metas cascade;
drop table if exists dividas cascade;
drop table if exists orcamentos cascade;
drop table if exists transacoes cascade;
drop table if exists categorias cascade;
drop table if exists cartoes cascade;
drop table if exists contas cascade;
drop table if exists perfis cascade;
drop table if exists familia_membros cascade;
drop table if exists familias cascade;

drop function if exists trg_dividas_quitar cascade;
drop function if exists trg_seed_categorias cascade;
drop function if exists minha_familia_id cascade;
drop function if exists membros_da_familia cascade;
