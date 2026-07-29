alter table transacoes
  add column if not exists tipo_despesa text check (tipo_despesa in ('fixa', 'variavel', 'parcelada'));
