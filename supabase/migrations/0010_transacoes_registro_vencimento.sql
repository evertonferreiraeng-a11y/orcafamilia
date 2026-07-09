alter table transacoes add column if not exists data_registro date;
alter table transacoes add column if not exists data_vencimento date;

update transacoes set data_registro = data where data_registro is null;
update transacoes set data_vencimento = data where data_vencimento is null;
