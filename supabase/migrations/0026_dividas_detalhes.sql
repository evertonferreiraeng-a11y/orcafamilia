-- ============================================
-- DIVIDAS: detalhes para negociação
-- valor original, valor atual (cobrado hoje), tipo da dívida,
-- situação no crédito (ex.: negativada), % de desconto sobre o valor atual,
-- e juros (% a.m.) + parcela mensal usados no plano de quitação.
-- ============================================
alter table dividas add column if not exists valor_original numeric(12,2);
alter table dividas add column if not exists valor_atual numeric(12,2);
alter table dividas add column if not exists tipo_divida text;
alter table dividas add column if not exists situacao_credito text;
alter table dividas add column if not exists desconto_pct numeric(5,2);
alter table dividas add column if not exists taxa_juros_mensal numeric(6,3);
alter table dividas add column if not exists parcela_mensal numeric(12,2);

alter table dividas drop constraint if exists dividas_tipo_divida_check;
alter table dividas add constraint dividas_tipo_divida_check check (
  tipo_divida is null or tipo_divida in ('cartao_credito', 'limite_conta', 'emprestimo', 'consignado', 'financiamento', 'crediario', 'acordo', 'outros')
);
alter table dividas drop constraint if exists dividas_situacao_credito_check;
alter table dividas add constraint dividas_situacao_credito_check check (
  situacao_credito is null or situacao_credito in ('em_dia', 'atrasada', 'negativada', 'protestada', 'cobranca_judicial', 'em_acordo')
);
alter table dividas drop constraint if exists dividas_desconto_pct_check;
alter table dividas add constraint dividas_desconto_pct_check check (desconto_pct is null or (desconto_pct >= 0 and desconto_pct <= 100));
alter table dividas drop constraint if exists dividas_taxa_juros_check;
alter table dividas add constraint dividas_taxa_juros_check check (taxa_juros_mensal is null or (taxa_juros_mensal >= 0 and taxa_juros_mensal <= 100));
