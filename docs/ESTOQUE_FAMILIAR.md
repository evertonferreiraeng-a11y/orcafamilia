# Gestão de Estoque Familiar – Reserva 180 dias

Módulo do Life (app da família) para controlar a reserva de emergência de alimentos, água e itens do bebê.
Usa o mesmo login e a mesma família do Orçamento: **todos os membros da família veem e editam o mesmo estoque**,
no computador e no celular.

## Portal único

- `/inicio` — tela inicial com os apps da família (Orçamento Familiar e Gestão de Estoque Familiar).
  O login e a raiz do site agora redirecionam para cá.
- O menu lateral mostra os itens do app atual e tem um seletor **Orçamento | Estoque**.
- Para criar um novo app no futuro: adicione-o em `APPS` (`components/layout/Sidebar.tsx`) e um card em `app/(dashboard)/inicio/page.tsx`.

## Instalação (uma vez)

1. No Supabase, abra **SQL Editor** e rode o conteúdo de `supabase/migrations/0019_estoque_familiar.sql`
   (ou `supabase db push` se usar a CLI). A migração pode ser rodada mais de uma vez sem problema.
2. Faça o deploy normalmente. Na primeira vez que alguém da família abrir `/estoque`, o cadastro inicial é criado:
   15 produtos com metas (inclui 150 L de água em garrafas de 5 L), “Fórmula infantil” em controle separado e 5 locais.

## Telas (`/estoque/...`)

| Rota | O que faz |
|---|---|
| `/estoque` | Painel: % da reserva, água, alertas, investimento, gráficos |
| `/estoque/produtos` | Controle de estoque (meta, atual, disponível, mínimo, repor, status) |
| `/estoque/lotes` | Validade por lote, alertas 90/60/30 dias e vencidos, ordem FEFO |
| `/estoque/movimentacoes` | Histórico completo, saídas e estorno |
| `/estoque/compras` | Lista de compras automática → entrada no estoque |
| `/estoque/financeiro` | Orçamento mensal, gastos por categoria, comparação de preços |
| `/estoque/agua` | Água em litros e garrafas (500 ml a 20 L) |
| `/estoque/bebe` | Itens do bebê (fora do % da reserva) |
| `/estoque/locais` | Locais e condições de armazenamento |
| `/estoque/relatorios` | 10 relatórios com exportação Excel (.xlsx), CSV e PDF |
| `/estoque/configuracoes` | Orçamento, exportação e **importação do backup da versão offline (HTML)** |

## Regras (no banco, atômicas)

As operações que mudam quantidades são funções do Postgres (`estoque_entrada`, `estoque_saida`,
`estoque_estornar`, `estoque_atualizar_lote`), executadas com a RLS do usuário:

- **FEFO**: a saída consome primeiro o lote que vence antes; consumo nunca usa lote vencido.
- Saída maior que o estoque é recusada (`ESTOQUE_INSUFICIENTE`) — só passa com confirmação explícita
  na tela, e o excedente vai para um lote “SALDO NEGATIVO”.
- Estorno desfaz a movimentação e mantém o registro riscado; entrada só pode ser estornada se o lote não teve saídas.
- Editar a quantidade de um lote gera um “Ajuste de inventário”.
- Cada movimentação registra quem a fez (`user_id`).

## Código

- `lib/estoque/calc.ts` — cálculos, alertas, plano FEFO e relatórios (funções puras)
- `lib/estoque/exportar.ts` — Excel/CSV/PDF sem bibliotecas extras
- `lib/estoque/carregar.ts` — carrega os dados da família (paginando acima de 1000 linhas)
- `components/estoque/*` — telas, formulários e contexto (`EstoqueContext`)

## Observação sobre uso offline

Os dados ficam na nuvem (Supabase); sem internet a tela avisa e as alterações não são salvas.
A versão em arquivo HTML continua disponível para uso 100% offline, e o backup dela pode ser importado aqui.
