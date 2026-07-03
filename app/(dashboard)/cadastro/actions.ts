'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';
import type { TipoConta, TipoLancamento, TipoInvestimento } from '@/types/database';

export interface CadastroFormState {
  error?: string;
}

async function getUser() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ============================================
// CONTAS
// ============================================
export async function criarConta(_prevState: CadastroFormState, formData: FormData): Promise<CadastroFormState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const nome = String(formData.get('nome') || '').trim();
  const tipo = String(formData.get('tipo') || 'corrente') as TipoConta;
  const saldo_inicial = Number(formData.get('saldo_inicial') || 0);
  const cor = String(formData.get('cor') || '#2a78d6');

  if (!nome) return { error: 'Informe o nome da conta.' };

  const { error } = await supabase.from('contas').insert({ user_id: user.id, nome, tipo, saldo_inicial, cor });
  if (error) return { error: error.message };

  revalidatePath('/cadastro');
  revalidatePath('/dashboard');
  return {};
}

export async function atualizarConta(
  id: string,
  _prevState: CadastroFormState,
  formData: FormData
): Promise<CadastroFormState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const nome = String(formData.get('nome') || '').trim();
  const tipo = String(formData.get('tipo') || 'corrente') as TipoConta;
  const saldo_inicial = Number(formData.get('saldo_inicial') || 0);
  const cor = String(formData.get('cor') || '#2a78d6');

  if (!nome) return { error: 'Informe o nome da conta.' };

  const { error } = await supabase
    .from('contas')
    .update({ nome, tipo, saldo_inicial, cor })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/cadastro');
  revalidatePath('/dashboard');
  return {};
}

export async function excluirConta(id: string): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from('contas').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/cadastro');
  revalidatePath('/dashboard');
}

// ============================================
// CARTOES
// ============================================
export async function criarCartao(_prevState: CadastroFormState, formData: FormData): Promise<CadastroFormState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = {
    nome: String(formData.get('nome') || '').trim(),
    bandeira: String(formData.get('bandeira') || '').trim() || null,
    limite: Number(formData.get('limite') || 0),
    dia_fechamento: Number(formData.get('dia_fechamento') || 1),
    dia_vencimento: Number(formData.get('dia_vencimento') || 1),
    conta_pagamento_id: String(formData.get('conta_pagamento_id') || '') || null,
  };

  if (!dados.nome) return { error: 'Informe o nome do cartão.' };

  const { error } = await supabase.from('cartoes').insert({ user_id: user.id, ...dados });
  if (error) return { error: error.message };

  revalidatePath('/cadastro');
  return {};
}

export async function atualizarCartao(
  id: string,
  _prevState: CadastroFormState,
  formData: FormData
): Promise<CadastroFormState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = {
    nome: String(formData.get('nome') || '').trim(),
    bandeira: String(formData.get('bandeira') || '').trim() || null,
    limite: Number(formData.get('limite') || 0),
    dia_fechamento: Number(formData.get('dia_fechamento') || 1),
    dia_vencimento: Number(formData.get('dia_vencimento') || 1),
    conta_pagamento_id: String(formData.get('conta_pagamento_id') || '') || null,
  };

  if (!dados.nome) return { error: 'Informe o nome do cartão.' };

  const { error } = await supabase.from('cartoes').update(dados).eq('id', id).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/cadastro');
  return {};
}

export async function excluirCartao(id: string): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from('cartoes').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/cadastro');
}

// ============================================
// CATEGORIAS
// ============================================
export async function criarCategoria(_prevState: CadastroFormState, formData: FormData): Promise<CadastroFormState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const nome = String(formData.get('nome') || '').trim();
  const tipo = String(formData.get('tipo') || 'despesa') as TipoLancamento;
  const cor = String(formData.get('cor') || '#888888');

  if (!nome) return { error: 'Informe o nome da categoria.' };

  const { error } = await supabase.from('categorias').insert({ user_id: user.id, nome, tipo, cor });
  if (error) return { error: error.message };

  revalidatePath('/cadastro');
  return {};
}

export async function atualizarCategoria(
  id: string,
  _prevState: CadastroFormState,
  formData: FormData
): Promise<CadastroFormState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const nome = String(formData.get('nome') || '').trim();
  const tipo = String(formData.get('tipo') || 'despesa') as TipoLancamento;
  const cor = String(formData.get('cor') || '#888888');

  if (!nome) return { error: 'Informe o nome da categoria.' };

  const { error } = await supabase.from('categorias').update({ nome, tipo, cor }).eq('id', id).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/cadastro');
  return {};
}

export async function excluirCategoria(id: string): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from('categorias').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/cadastro');
}

// ============================================
// INVESTIMENTOS
// ============================================
export async function criarInvestimento(_prevState: CadastroFormState, formData: FormData): Promise<CadastroFormState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = {
    nome: String(formData.get('nome') || '').trim(),
    tipo: (String(formData.get('tipo') || '') || null) as TipoInvestimento | null,
    instituicao: String(formData.get('instituicao') || '').trim() || null,
    valor_investido: Number(formData.get('valor_investido') || 0),
    valor_atual: Number(formData.get('valor_atual') || 0),
    data_aplicacao: String(formData.get('data_aplicacao') || '') || null,
  };

  if (!dados.nome || !dados.valor_investido || !dados.valor_atual) {
    return { error: 'Preencha nome, valor investido e valor atual.' };
  }

  const { error } = await supabase.from('investimentos').insert({ user_id: user.id, ...dados });
  if (error) return { error: error.message };

  revalidatePath('/cadastro');
  return {};
}

export async function atualizarInvestimento(
  id: string,
  _prevState: CadastroFormState,
  formData: FormData
): Promise<CadastroFormState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = {
    nome: String(formData.get('nome') || '').trim(),
    tipo: (String(formData.get('tipo') || '') || null) as TipoInvestimento | null,
    instituicao: String(formData.get('instituicao') || '').trim() || null,
    valor_investido: Number(formData.get('valor_investido') || 0),
    valor_atual: Number(formData.get('valor_atual') || 0),
    data_aplicacao: String(formData.get('data_aplicacao') || '') || null,
  };

  if (!dados.nome || !dados.valor_investido || !dados.valor_atual) {
    return { error: 'Preencha nome, valor investido e valor atual.' };
  }

  const { error } = await supabase.from('investimentos').update(dados).eq('id', id).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/cadastro');
  return {};
}

export async function excluirInvestimento(id: string): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from('investimentos').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/cadastro');
}
