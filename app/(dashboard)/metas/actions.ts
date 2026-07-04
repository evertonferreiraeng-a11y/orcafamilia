'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';

export interface MetaFormState {
  error?: string;
}

function parseFormData(formData: FormData) {
  return {
    nome: String(formData.get('nome') || '').trim(),
    descricao: String(formData.get('descricao') || '').trim() || null,
    valor_alvo: Number(formData.get('valor_alvo') || 0),
    valor_atual: Number(formData.get('valor_atual') || 0),
    data_alvo: String(formData.get('data_alvo') || '') || null,
  };
}

export async function criarMeta(_prevState: MetaFormState, formData: FormData): Promise<MetaFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = parseFormData(formData);
  if (!dados.nome || !dados.valor_alvo) {
    return { error: 'Preencha nome e valor alvo.' };
  }

  const { error } = await supabase.from('metas').insert({ user_id: user.id, ...dados });
  if (error) return { error: error.message };

  revalidatePath('/metas');
  return {};
}

export async function atualizarMeta(
  id: string,
  _prevState: MetaFormState,
  formData: FormData
): Promise<MetaFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = parseFormData(formData);
  if (!dados.nome || !dados.valor_alvo) {
    return { error: 'Preencha nome e valor alvo.' };
  }

  const { error } = await supabase.from('metas').update(dados).eq('id', id).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/metas');
  return {};
}

export async function registrarAporteMeta(
  id: string,
  _prevState: MetaFormState,
  formData: FormData
): Promise<MetaFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const valorAporte = Number(formData.get('valor_aporte') || 0);
  if (!valorAporte || valorAporte <= 0) {
    return { error: 'Informe um valor de aporte válido.' };
  }

  const { data: meta } = await supabase
    .from('metas')
    .select('valor_atual')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!meta) return { error: 'Meta não encontrada.' };

  const { error } = await supabase
    .from('metas')
    .update({ valor_atual: Number(meta.valor_atual) + valorAporte })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/metas');
  return {};
}

export async function excluirMeta(id: string): Promise<void> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('metas').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/metas');
}
