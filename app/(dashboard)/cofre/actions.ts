'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';
import type { TipoMovimentacaoCofre } from '@/types/database';

export interface CofreFormState {
  error?: string;
}

function parseFormData(formData: FormData) {
  return {
    nome: String(formData.get('nome') || '').trim(),
    descricao: String(formData.get('descricao') || '').trim() || null,
    cor: String(formData.get('cor') || '') || null,
  };
}

export async function criarCofre(_prevState: CofreFormState, formData: FormData): Promise<CofreFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = parseFormData(formData);
  if (!dados.nome) return { error: 'Preencha o nome do cofre.' };

  const saldoInicial = Number(formData.get('saldo_inicial') || 0);

  const { error } = await supabase.from('cofres').insert({ user_id: user.id, ...dados, saldo: saldoInicial });
  if (error) return { error: error.message };

  revalidatePath('/cofre');
  return {};
}

export async function atualizarCofre(
  id: string,
  _prevState: CofreFormState,
  formData: FormData
): Promise<CofreFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = parseFormData(formData);
  if (!dados.nome) return { error: 'Preencha o nome do cofre.' };

  const { error } = await supabase.from('cofres').update(dados).eq('id', id).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/cofre');
  return {};
}

export async function registrarMovimentacaoCofre(
  id: string,
  _prevState: CofreFormState,
  formData: FormData
): Promise<CofreFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const tipo = String(formData.get('tipo') || '') as TipoMovimentacaoCofre;
  const valor = Number(formData.get('valor') || 0);
  const data = String(formData.get('data') || '');
  const descricao = String(formData.get('descricao') || '').trim() || null;

  if (tipo !== 'deposito' && tipo !== 'retirada') return { error: 'Selecione o tipo de movimentação.' };
  if (!valor || valor <= 0) return { error: 'Informe um valor válido.' };
  if (!data) return { error: 'Informe a data.' };

  const { data: cofre } = await supabase.from('cofres').select('saldo').eq('id', id).eq('user_id', user.id).single();
  if (!cofre) return { error: 'Cofre não encontrado.' };

  const saldoAtual = Number(cofre.saldo);
  if (tipo === 'retirada' && valor > saldoAtual) {
    return { error: 'Valor de retirada maior que o saldo disponível no cofre.' };
  }

  const novoSaldo = tipo === 'deposito' ? saldoAtual + valor : saldoAtual - valor;

  const { error: erroMovimentacao } = await supabase
    .from('cofre_movimentacoes')
    .insert({ cofre_id: id, user_id: user.id, tipo, valor, data, descricao });
  if (erroMovimentacao) return { error: erroMovimentacao.message };

  const { error } = await supabase.from('cofres').update({ saldo: novoSaldo }).eq('id', id).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/cofre');
  return {};
}

export async function excluirCofre(id: string): Promise<void> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('cofres').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/cofre');
}

export async function excluirMovimentacaoCofre(id: string, cofreId: string): Promise<void> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: movimentacao } = await supabase
    .from('cofre_movimentacoes')
    .select('tipo, valor')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!movimentacao) return;

  const { data: cofre } = await supabase.from('cofres').select('saldo').eq('id', cofreId).eq('user_id', user.id).single();
  if (!cofre) return;

  const saldoAtual = Number(cofre.saldo);
  const valor = Number(movimentacao.valor);
  const saldoRevertido = movimentacao.tipo === 'deposito' ? saldoAtual - valor : saldoAtual + valor;

  await supabase.from('cofre_movimentacoes').delete().eq('id', id).eq('user_id', user.id);
  await supabase.from('cofres').update({ saldo: saldoRevertido }).eq('id', cofreId).eq('user_id', user.id);

  revalidatePath('/cofre');
}
