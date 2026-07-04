-- ============================================
-- METAS: adiciona campo de imagem
-- ============================================
alter table metas add column if not exists imagem_url text;

-- ============================================
-- STORAGE: bucket público para imagens das metas
-- (leitura pública para exibir a imagem direto pela URL; escrita
-- restrita ao próprio usuário, via pasta {user_id}/ no caminho)
-- ============================================
insert into storage.buckets (id, name, public)
values ('metas', 'metas', true)
on conflict (id) do nothing;

create policy "metas_imagens_select" on storage.objects for select
using (bucket_id = 'metas');

create policy "metas_imagens_insert" on storage.objects for insert
with check (
  bucket_id = 'metas'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "metas_imagens_update" on storage.objects for update
using (
  bucket_id = 'metas'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "metas_imagens_delete" on storage.objects for delete
using (
  bucket_id = 'metas'
  and (storage.foldername(name))[1] = auth.uid()::text
);
