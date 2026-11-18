# Life · JP

Lista de convidados: quem foi convidado, se o convite já foi enviado e quem confirmou presença.
Usa o mesmo login e a mesma família dos outros apps do Life.

## Instalação (uma vez)

1. No Supabase → **SQL Editor**, rode `supabase/migrations/0027_jp.sql`.
2. Abra `/jp` → **Importar planilha**. No Excel, selecione as colunas **A a E**
   (Nome do convite · Telefone · Nome dos convidados · Convite · Situação), copie (Ctrl+C) e cole.
   Linhas sem nome do convite entram no convite da linha de cima.

## Tela `/jp`

- Resumo: confirmados, não vão, sem resposta e convites enviados, com barra sim/não/pendente.
- Convidados agrupados por convite. Em cada convite: **Enviar/Enviado** (marca o grupo todo),
  botão do **WhatsApp** (primeiro telefone do grupo) e **+** para incluir alguém no convite.
- Em cada pessoa: **Sim / Não / ?** muda a resposta na hora; editar e excluir.
- Filtros por resposta e por convite enviado, e busca por nome, convite ou telefone.
  Também abrem por URL: `/jp?resposta=pendente`, `/jp?enviado=nao`.

## Início

O card **JP** mostra confirmados de quantos convidados, sim/não/pendente e o progresso dos
convites enviados. Convites ainda não enviados aparecem em "Pede atenção".
