-- ============================================
-- EXTENSIONS
-- ============================================
create extension if not exists "pgcrypto";

-- ============================================
-- FAMÍLIA (agrupa os dois usuários)
-- ============================================
create table familias (
  id uuid primary key default gen_random_uuid(),
  nome text not null default 'Minha Família',
  criado_em timestamptz default now()
);

create table familia_membros (
  familia_id uuid references familias(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (familia_id, user_id)
);

-- ============================================
-- PERFIL (dados extras do usuário, incl. telefone p/ WhatsApp)
-- ============================================
create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  telefone text, -- formato E.164, ex: +5511999999999
  familia_id uuid references familias(id),
  criado_em timestamptz default now()
);

-- ============================================
-- CONTAS BANCÁRIAS
-- ============================================
create table contas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  nome text not null,               -- ex: "Nubank", "Itaú"
  tipo text not null default 'corrente', -- corrente | poupanca | investimento | dinheiro
  saldo_inicial numeric(12,2) not null default 0,
  cor text default '#2a78d6',
  ativa boolean default true,
  criado_em timestamptz default now()
);

-- ============================================
-- CARTÕES DE CRÉDITO
-- ============================================
create table cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  nome text not null,               -- ex: "Nubank Ultravioleta"
  bandeira text,                    -- Visa, Mastercard, etc
  limite numeric(12,2) not null default 0,
  dia_fechamento int not null,      -- 1-31
  dia_vencimento int not null,      -- 1-31
  conta_pagamento_id uuid references contas(id),
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- ============================================
-- CATEGORIAS
-- ============================================
create table categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  nome text not null,               -- ex: "Alimentação", "Salário"
  tipo text not null,               -- 'receita' | 'despesa'
  cor text default '#888888',
  icone text,
  criado_em timestamptz default now()
);

-- ============================================
-- TRANSAÇÕES (receitas e despesas)
-- ============================================
create table transacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  conta_id uuid references contas(id),
  cartao_id uuid references cartoes(id),
  categoria_id uuid references categorias(id) not null,
  tipo text not null,               -- 'receita' | 'despesa'
  descricao text not null,
  valor numeric(12,2) not null,
  data date not null,
  recorrente boolean default false,
  frequencia text,                  -- 'mensal', 'semanal', null se não recorrente
  criado_em timestamptz default now()
);
create index idx_transacoes_user_data on transacoes(user_id, data);

-- ============================================
-- ORÇAMENTOS (por categoria, por mês)
-- ============================================
create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  categoria_id uuid references categorias(id) not null,
  valor_limite numeric(12,2) not null,
  mes_referencia date not null,     -- salvar como primeiro dia do mês, ex: 2026-07-01
  criado_em timestamptz default now(),
  unique(user_id, categoria_id, mes_referencia)
);

-- ============================================
-- DÍVIDAS
-- ============================================
create table dividas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  descricao text not null,          -- ex: "Financiamento carro"
  credor text,                      -- ex: "Banco Itaú"
  valor_total numeric(12,2) not null,
  valor_pago numeric(12,2) not null default 0,
  parcelas_total int,
  parcelas_pagas int default 0,
  data_vencimento date not null,    -- próxima parcela
  status text default 'ativa',      -- 'ativa' | 'quitada'
  criado_em timestamptz default now()
);

-- ============================================
-- METAS FINANCEIRAS
-- ============================================
create table metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  nome text not null,               -- ex: "Viagem de férias"
  valor_alvo numeric(12,2) not null,
  valor_atual numeric(12,2) not null default 0,
  data_alvo date,
  criado_em timestamptz default now()
);

-- ============================================
-- INVESTIMENTOS
-- ============================================
create table investimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  nome text not null,               -- ex: "Tesouro Selic"
  tipo text,                        -- 'renda_fixa' | 'renda_variavel' | 'fundo' | 'outro'
  instituicao text,
  valor_investido numeric(12,2) not null,
  valor_atual numeric(12,2) not null,
  data_aplicacao date,
  criado_em timestamptz default now()
);

-- ============================================
-- CONFIGURAÇÃO DE ALERTAS (WhatsApp)
-- ============================================
create table alertas_config (
  user_id uuid primary key references auth.users(id),
  telefone text,                             -- E.164
  alerta_saldo_ativo boolean default false,
  alerta_saldo_limite numeric(12,2),         -- avisa quando saldo cair abaixo disso
  alerta_divida_ativo boolean default false,
  alerta_divida_dias_antes int default 3,    -- avisa X dias antes do vencimento
  alerta_orcamento_ativo boolean default false,
  alerta_orcamento_percentual int default 90 -- avisa ao atingir X% do orçamento
);

-- ============================================
-- LOG DE NOTIFICAÇÕES ENVIADAS
-- ============================================
create table notificacoes_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  tipo text not null,               -- 'saldo' | 'divida' | 'orcamento'
  mensagem text not null,
  enviado_em timestamptz default now(),
  status text default 'enviado'     -- 'enviado' | 'erro'
);

-- ============================================
-- TRIGGER: quitar dívida automaticamente
-- ============================================
create or replace function trg_dividas_quitar()
returns trigger
language plpgsql
as $$
begin
  if new.valor_pago >= new.valor_total then
    new.status := 'quitada';
  else
    new.status := 'ativa';
  end if;
  return new;
end;
$$;

create trigger dividas_quitar_automatico
before insert or update of valor_pago, valor_total on dividas
for each row execute function trg_dividas_quitar();

-- ============================================
-- TRIGGER: seed de categorias padrão ao criar perfil
-- ============================================
create or replace function trg_seed_categorias()
returns trigger
language plpgsql
as $$
begin
  insert into categorias (user_id, nome, tipo, cor) values
    (new.id, 'Salário', 'receita', '#16a34a'),
    (new.id, 'Outras receitas', 'receita', '#22c55e'),
    (new.id, 'Alimentação', 'despesa', '#f97316'),
    (new.id, 'Moradia', 'despesa', '#0ea5e9'),
    (new.id, 'Transporte', 'despesa', '#8b5cf6'),
    (new.id, 'Saúde', 'despesa', '#ec4899'),
    (new.id, 'Lazer', 'despesa', '#eab308'),
    (new.id, 'Educação', 'despesa', '#14b8a6'),
    (new.id, 'Outras despesas', 'despesa', '#6b7280');
  return new;
end;
$$;

create trigger perfis_seed_categorias
after insert on perfis
for each row execute function trg_seed_categorias();
