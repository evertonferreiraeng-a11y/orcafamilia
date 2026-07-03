'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';

export interface OrcamentoFormState {
  error?: string;
}

export async function criarOrcamento(_prevState: OrcamentoFormState, formData: FormData): Promise<OrcamentoFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const categoria_id = String(formData.get('categoria_id') || '');
  const valor_limite = Number(formData.get('valor_limite') || 0);
  const mes_referencia = String(formData.get('mes_referencia') || '');

  if (!categoria_id || !valor_limite || !mes_referencia) {
    return { error: 'Selecione a categoria e informe o valor limite.' };
  }

  const { error } = await supabase.from('orcamentos').insert({
    user_id: user.id,
    categoria_id,
    valor_limite,
    mes_referencia,
  });

  if (error) {
    if (error.code === '23505') return { error: 'Já existe um orçamento para esta categoria neste mês.' };
    return { error: error.message };
  }

  revalidatePath('/orcamentos');
  return {};
}

export async function atualizarOrcamento(
  id: string,
  _prevState: OrcamentoFormState,
  formData: FormData
): Promise<OrcamentoFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const valor_limite = Number(formData.get('valor_limite') || 0);
  if (!valor_limite) return { error: 'Informe o valor limite.' };

  const { error } = await supabase
    .from('orcamentos')
    .update({ valor_limite })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/orcamentos');
  return {};
}

export async function excluirOrcamento(id: string): Promise<void> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('orcamentos').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/orcamentos');
}
