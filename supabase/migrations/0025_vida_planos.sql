-- ============================================
-- LIFE · MENTOR DE VIDA — PLANOS, ETAPAS E INDICADORES
-- Planos de ação (ex.: sair das dívidas, trocar de emprego) com etapas,
-- indicadores e histórico de valores. Parâmetros das dívidas (juros e
-- parcela) para o simulador de quitação.
-- Tudo PRIVADO por usuário (user_id = auth.uid()), como em 0024.
-- ============================================

create table if not exists vida_planos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pilar smallint,
  titulo text not null,
  objetivo text,
  resumo text,
  prazo date,
  status text not null default 'ativo',
  origem text not null default 'manual',     -- 'manual' | 'ia' | 'dividas'
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  constraint vida_planos_pilar_check check (pilar is null or pilar between 1 and 10),
  constraint vida_planos_status_check check (status in ('ativo', 'pausado', 'concluido'))
);
create index if not exists vida_planos_user_idx on vida_planos (user_id, status, atualizado_em desc);

create table if not exists vida_etapas (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references vida_planos(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ordem int not null default 0,
  titulo text not null,
  detalhe text,
  prazo date,
  feita boolean not null default false,
  feita_em timestamptz
);
create index if not exists vida_etapas_plano_idx on vida_etapas (plano_id, ordem);

-- fonte: 'manual' ou automática a partir dos dados do Life:
--   'dividas_restante' (soma do que falta pagar nas dívidas ativas)
--   'sobra_mes'        (receitas − despesas do mês corrente)
--   'cofre_saldo'      (soma dos cofres)
create table if not exists vida_indicadores (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references vida_planos(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  unidade text not null default '',
  meta numeric(14,2),
  inicial numeric(14,2),
  direcao text not null default 'subir',
  fonte text not null default 'manual',
  ordem int not null default 0,
  constraint vida_indicadores_direcao_check check (direcao in ('subir', 'descer')),
  constraint vida_indicadores_fonte_check check (fonte in ('manual', 'dividas_restante', 'sobra_mes', 'cofre_saldo'))
);
create index if not exists vida_indicadores_plano_idx on vida_indicadores (plano_id, ordem);

create table if not exists vida_registros (
  id uuid primary key default gen_random_uuid(),
  indicador_id uuid not null references vida_indicadores(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null default current_date,
  valor numeric(14,2) not null,
  constraint vida_registros_uk unique (indicador_id, data)
);

-- Juros e parcela de cada dívida (o cadastro de Dívidas não guarda isso).
create table if not exists vida_dividas_params (
  divida_id uuid primary key references dividas(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  taxa_mensal numeric(6,3),   -- % ao mês
  parcela numeric(12,2),      -- pagamento mínimo/mensal
  atualizado_em timestamptz default now()
);

do $$
declare t text;
begin
  foreach t in array array['vida_planos', 'vida_etapas', 'vida_indicadores', 'vida_registros', 'vida_dividas_params'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "dono_select" on %I', t);
    execute format('drop policy if exists "dono_insert" on %I', t);
    execute format('drop policy if exists "dono_update" on %I', t);
    execute format('drop policy if exists "dono_delete" on %I', t);
    execute format('create policy "dono_select" on %I for select using (user_id = auth.uid())', t);
    execute format('create policy "dono_insert" on %I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "dono_update" on %I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "dono_delete" on %I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;
