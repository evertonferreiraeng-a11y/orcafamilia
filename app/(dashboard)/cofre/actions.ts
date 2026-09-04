'use server';

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
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
    notas: String(formData.get('notas') || '').trim() || null,
    cor: String(formData.get('cor') || '') || null,
  };
}

function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function senhaConfere(senha: string, senhaHash: string): boolean {
  const [salt, hash] = senhaHash.split(':');
  if (!salt || !hash) return false;
  const hashArmazenado = Buffer.from(hash, 'hex');
  const hashInformado = scryptSync(senha, salt, 64);
  return hashArmazenado.length === hashInformado.length && timingSafeEqual(hashArmazenado, hashInformado);
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
  const senha = String(formData.get('senha') || '');

  const { error } = await supabase.from('cofres').insert({
    user_id: user.id,
    ...dados,
    saldo: saldoInicial,
    senha_hash: senha ? hashSenha(senha) : null,
  });
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

  const senhaAtual = String(formData.get('senha_atual') || '');
  const senha = String(formData.get('senha') || '');
  const removerSenha = formData.get('remover_senha') === 'on';

  const { data: cofreAtual } = await supabase
    .from('cofres')
    .select('senha_hash')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!cofreAtual) return { error: 'Cofre não encontrado.' };

  const querAlterarSenha = removerSenha || !!senha;
  if (cofreAtual.senha_hash && querAlterarSenha) {
    if (!senhaAtual || !senhaConfere(senhaAtual, cofreAtual.senha_hash)) {
      return { error: 'Senha atual incorreta.' };
    }
  }

  const atualizacao: typeof dados & { senha_hash?: string | null } = { ...dados };
  if (removerSenha) {
    atualizacao.senha_hash = null;
  } else if (senha) {
    atualizacao.senha_hash = hashSenha(senha);
  }

  const { error } = await supabase.from('cofres').update(atualizacao).eq('id', id).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/cofre');
  return {};
}

export async function verificarSenhaCofre(id: string, senha: string): Promise<{ ok: boolean }> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: cofre } = await supabase
    .from('cofres')
    .select('senha_hash')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!cofre) return { ok: false };
  if (!cofre.senha_hash) return { ok: true };

  return { ok: senhaConfere(senha, cofre.senha_hash) };
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
