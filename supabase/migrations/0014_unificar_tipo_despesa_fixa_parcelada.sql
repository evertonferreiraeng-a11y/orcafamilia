-- ============================================
-- TRANSACOES: unifica "parcelada" em "fixa" — tipo_despesa passa a ter
-- apenas 2 opções (variavel, fixa). Compras parceladas continuam
-- funcionando normalmente (várias parcelas geradas via meses_recorrencia),
-- só deixam de ter um "tipo" próprio na UI.
-- ============================================
update transacoes set tipo_despesa = 'fixa' where tipo_despesa = 'parcelada';

alter table transacoes drop constraint if exists transacoes_tipo_despesa_check;
alter table transacoes
  add constraint transacoes_tipo_despesa_check check (tipo_despesa in ('fixa', 'variavel'));
