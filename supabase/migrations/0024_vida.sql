-- ============================================
-- LIFE · APP MENTOR DE VIDA
-- Conselheiro de vida com IA: conversas por assunto/pilar, instruções
-- pessoais e painel mensal dos 10 pilares (nota 0–10 + diagnóstico).
--
-- DIFERENTE dos outros apps: tudo é PRIVADO por usuário (user_id = auth.uid()).
-- Nem outros membros da família enxergam.
-- ============================================

-- ---------- INSTRUÇÕES / CONTEXTO PESSOAL (1 linha por usuário) ----------
create table if not exists vida_contexto (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  texto text not null default '',
  atualizado_em timestamptz default now()
);

-- ---------- CONVERSAS ----------
create table if not exists vida_conversas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null default 'Nova conversa',
  pilar smallint,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  constraint vida_conversas_pilar_check check (pilar is null or pilar between 1 and 10)
);
create index if not exists vida_conversas_user_idx on vida_conversas (user_id, atualizado_em desc);

-- ---------- MENSAGENS ----------
create table if not exists vida_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references vida_conversas(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  papel text not null,
  conteudo text not null,
  criado_em timestamptz default now(),
  constraint vida_mensagens_papel_check check (papel in ('user', 'assistant'))
);
create index if not exists vida_mensagens_conversa_idx on vida_mensagens (conversa_id, criado_em);

-- ---------- PAINEL MENSAL DOS 10 PILARES ----------
create table if not exists vida_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mes date not null,                 -- sempre dia 1
  pilar smallint not null,
  nota numeric(3,1),                 -- 0–10; null = sem informação suficiente
  situacao text,
  problema text,
  objetivo text,
  proxima_acao text,
  indicador text,
  origem text not null default 'manual',  -- 'manual' | 'ia'
  atualizado_em timestamptz default now(),
  constraint vida_avaliacoes_pilar_check check (pilar between 1 and 10),
  constraint vida_avaliacoes_nota_check check (nota is null or (nota >= 0 and nota <= 10)),
  constraint vida_avaliacoes_uk unique (user_id, mes, pilar)
);

-- ---------- RLS: só o próprio usuário ----------
do $$
declare t text;
begin
  foreach t in array array['vida_contexto', 'vida_conversas', 'vida_mensagens', 'vida_avaliacoes'] loop
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
