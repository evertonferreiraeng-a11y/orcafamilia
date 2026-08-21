# Guia: unificar "Parcelada" em "Fixa" no OrçaFamilia

O push automático para o GitHub foi bloqueado pelo controle de segurança deste
ambiente (o repositório não está na lista de "sources" autorizados desta
sessão — isso não tem relação com o token que você me passou). Este guia
te dá duas formas de aplicar a mudança sem precisar salvar nada no seu
computador.

## Opção A — Aplicar o patch (para quem tem terminal à mão)

Anexei o arquivo `0001-unificar-tipo-despesa.patch`. Em qualquer lugar com o
repositório clonado (ex: GitHub Codespaces, que roda no navegador):

```bash
git am 0001-unificar-tipo-despesa.patch
git push origin main
```

## Opção B — Colar direto no editor web do GitHub (sem terminal)

Para cada arquivo abaixo, abra o link, clique no ícone de lápis (Edit) e
substitua todo o conteúdo pelo texto correspondente. Ao final de cada um,
clique em "Commit changes..." direto na branch `main`.

1. https://github.com/evertonferreiraeng-a11y/orcafamilia/edit/main/types/database.ts
2. https://github.com/evertonferreiraeng-a11y/orcafamilia/edit/main/lib/gerente.ts
3. https://github.com/evertonferreiraeng-a11y/orcafamilia/edit/main/components/transacoes/TransacaoForm.tsx
4. https://github.com/evertonferreiraeng-a11y/orcafamilia/edit/main/components/transacoes/TransacoesClient.tsx
5. https://github.com/evertonferreiraeng-a11y/orcafamilia/edit/main/app/(dashboard)/dashboard/page.tsx
6. Criar um arquivo novo em `supabase/migrations/0014_unificar_tipo_despesa_fixa_parcelada.sql`
   (use "Add file" → "Create new file" na pasta `supabase/migrations`).

O conteúdo final de cada arquivo está nos arquivos anexos separados
(`01_types_database.ts.txt`, `02_lib_gerente.ts.txt`, etc.) para facilitar o
copiar e colar.

## Depois do commit no GitHub

A Vercel vai fazer o deploy automático assim que detectar o push na `main`.

**Não esqueça de rodar a migration no Supabase** (SQL Editor → cole e
execute o conteúdo de `06_migration_0014.sql`). Sem isso, os registros
antigos com `tipo_despesa = 'parcelada'` continuam no banco e o app vai
falhar ao tentar salvar novas transações porque a constraint antiga ainda
permite 'parcelada' mas o código não vai mais enviar esse valor — o ideal é
rodar a migration para manter tudo consistente.

## O que mudou, resumindo

- "Tipo de Despesa" no formulário de transação agora tem só **Variável** e
  **Fixa** (o botão "Parcelada" foi removido).
- Compras parceladas continuam funcionando: ao escolher "Fixa", o campo
  "Gerar lançamentos para quantos meses?" cria as parcelas normalmente —
  só deixou de ter uma categoria própria.
- Os cálculos do dashboard e os insights do Gerente Financeiro foram
  ajustados para tratar tudo que era "parcelada" como "fixa".
- A migration converte os registros existentes no banco de 'parcelada' para
  'fixa' e atualiza a regra (constraint) da coluna.
