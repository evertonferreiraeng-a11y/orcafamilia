'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';
import type { TipoLancamento, Frequencia } from '@/types/database';

export interface TransacaoFormState {
  error?: string;
}

function parseFormData(formData: FormData) {
  const recorrente = formData.get('recorrente') === 'on';

  return {
    tipo: String(formData.get('tipo') || 'despesa') as TipoLancamento,
    descricao: String(formData.get('descricao') || '').trim(),
    valor: Number(formData.get('valor') || 0),
    data: String(formData.get('data') || ''),
    categoria_id: String(formData.get('categoria_id') || ''),
    conta_id: String(formData.get('conta_id') || '') || null,
    cartao_id: String(formData.get('cartao_id') || '') || null,
    recorrente,
    frequencia: recorrente ? (String(formData.get('frequencia') || 'mensal') as Frequencia) : null,
  };
}

export async function criarTransacao(_prevState: TransacaoFormState, formData: FormData): Promise<TransacaoFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = parseFormData(formData);

  if (!dados.descricao || !dados.valor || !dados.data || !dados.categoria_id) {
    return { error: 'Preencha descrição, valor, data e categoria.' };
  }

  const { error } = await supabase.from('transacoes').insert({
    user_id: user.id,
    ...dados,
  });

  if (error) return { error: error.message };

  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
  return {};
}

export async function atualizarTransacao(
  id: string,
  _prevState: TransacaoFormState,
  formData: FormData
): Promise<TransacaoFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = parseFormData(formData);

  if (!dados.descricao || !dados.valor || !dados.data || !dados.categoria_id) {
    return { error: 'Preencha descrição, valor, data e categoria.' };
  }

  const { error } = await supabase.from('transacoes').update(dados).eq('id', id).eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
  return {};
}

export async function excluirTransacao(id: string): Promise<void> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('transacoes').delete().eq('id', id).eq('user_id', user.id);

  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
}
