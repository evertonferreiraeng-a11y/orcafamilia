# Life · Casa

App de manutenções periódicas da casa: filtro de água, ar-condicionado, caixa d'água, dedetização etc.
Usa o mesmo login e a mesma família dos outros apps do Life.

## Instalação (uma vez)

No Supabase → **SQL Editor**, rode `supabase/migrations/0020_casa.sql`. Na primeira vez que alguém da família
abrir `/casa`, são criados 4 itens (purificador de água, ar-condicionado, caixa d'água, caixa de gordura) e
9 manutenções sugeridas, **sem data**. Para cada uma, clique em **Feito** e informe quando foi feita pela última vez.

## Telas (`/casa/...`)

| Rota | O que faz |
|---|---|
| `/casa` | Painel: vencidas, vencem em breve, em dia, sem data, agenda dos próximos 6 meses, gastos e garantias |
| `/casa/manutencoes` | Lista de manutenções com frequência, última vez, próxima data, status e botão **Feito** |
| `/casa/itens` | Itens/equipamentos com cômodo, marca, modelo e garantia, e as manutenções de cada um |
| `/casa/historico` | Tudo o que foi feito, com custo e prestador; exporta para Excel; permite desfazer |
| `/casa/prestadores` | Contatos (telefone, e-mail, WhatsApp) e total pago a cada um |

## Regras

- **Próxima data** = data em que foi feito + frequência (dias, semanas, meses ou anos). 31/jan + 1 mês = 28/fev.
  Pode ser ajustada manualmente.
- **Status**: vencida (passou da data) · vence em breve (dentro do “avisar com antecedência”) · em dia · sem data · pausada.
- Registrar uma data mais antiga que a última vez só entra no histórico, sem mudar a próxima data.
- **Desfazer** o registro mais recente volta a manutenção para as datas anteriores.
- Excluir um item apaga as manutenções dele e o histórico delas. Para só parar os alertas, desmarque “ativa”.

Registrar e desfazer são funções do banco (`casa_registrar_execucao`, `casa_desfazer_execucao`), atômicas e com RLS por família.
