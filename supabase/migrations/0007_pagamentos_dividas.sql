-- ============================================
-- PAGAMENTOS_DIVIDAS: histórico de pagamentos registrados
-- ============================================
create table pagamentos_dividas (
  id uuid primary key default gen_random_uuid(),
  divida_id uuid references dividas(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  valor numeric(12,2) not null,
  data_pagamento date not null,
  observacao text,
  criado_em timestamptz default now()
);

alter table pagamentos_dividas enable row level security;

create policy "ver_familia" on pagamentos_dividas for select
using (
  user_id = auth.uid()
  or user_id in (select membros_da_familia())
);

create policy "editar_proprio" on pagamentos_dividas for insert
with check (user_id = auth.uid());

create policy "excluir_proprio" on pagamentos_dividas for delete
using (user_id = auth.uid());
