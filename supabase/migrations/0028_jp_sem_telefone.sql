-- LIFE · JP — remove os telefones da lista de convidados (apaga os dados e a coluna)
alter table jp_convidados drop column if exists telefone;
