-- ============================================
-- LIFE · ESTOQUE · NOVOS TIPOS DE ITEM
-- Além de alimento, água e bebê: higiene e limpeza (papel higiênico,
-- papel toalha, guardanapo), saúde e primeiros socorros (kit médico) e
-- utilidades e emergência (lanterna, pilhas, velas).
-- Esses tipos não entram no percentual da reserva alimentar.
-- ============================================

alter table estoque_produtos drop constraint if exists estoque_produtos_tipo_check;
alter table estoque_produtos add constraint estoque_produtos_tipo_check
  check (tipo in ('alimento', 'agua', 'bebe', 'higiene', 'saude', 'utilidade'));
