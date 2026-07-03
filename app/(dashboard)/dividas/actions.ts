'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';

export interface DividaFormState {
  error?: string;
}

function parseFormData(formData: FormData) {
  return {
    descricao: String(formData.get('descricao') || '').trim(),
    credor: String(formData.get('credor') || '').trim() || null,
    valor_total: Number(formData.get('valor_total') || 0),
    parcelas_total: formData.get('parcelas_total') ? Number(formData.get('parcelas_total')) : null,
    data_vencimento: String(formData.get('data_vencimento') || ''),
  };
}

export async function criarDivida(_prevState: DividaFormState, formData: FormData): Promise<DividaFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = parseFormData(formData);
  if (!dados.descricao || !dados.valor_total || !dados.data_vencimento) {
    return { error: 'Preencha descrição, valor total e vencimento.' };
  }

  const { error } = await supabase.from('dividas').insert({ user_id: user.id, ...dados });
  if (error) return { error: error.message };

  revalidatePath('/dividas');
  revalidatePath('/dashboard');
  return {};
}

export async function atualizarDivida(
  id: string,
  _prevState: DividaFormState,
  formData: FormData
): Promise<DividaFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = parseFormData(formData);
  if (!dados.descricao || !dados.valor_total || !dados.data_vencimento) {
    return { error: 'Preencha descrição, valor total e vencimento.' };
  }

  const { error } = await supabase.from('dividas').update(dados).eq('id', id).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/dividas');
  return {};
}

export async function registrarPagamentoDivida(
  id: string,
  _prevState: DividaFormState,
  formData: FormData
): Promise<DividaFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const valorPagamento = Number(formData.get('valor_pagamento') || 0);
  if (!valorPagamento || valorPagamento <= 0) {
    return { error: 'Informe um valor de pagamento válido.' };
  }

  const { data: divida } = await supabase
    .from('dividas')
    .select('valor_pago, parcelas_pagas')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!divida) return { error: 'Dívida não encontrada.' };

  const { error } = await supabase
    .from('dividas')
    .update({
      valor_pago: Number(divida.valor_pago) + valorPagamento,
      parcelas_pagas: (divida.parcelas_pagas ?? 0) + 1,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/dividas');
  revalidatePath('/dashboard');
  return {};
}

export async function excluirDivida(id: string): Promise<void> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('dividas').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/dividas');
  revalidatePath('/dashboard');
}
