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
    categoria_id: String(formData.get('categoria_id') || '') || null,
    valor_total: Number(formData.get('valor_total') || 0),
    parcelas_total: formData.get('parcelas_total') ? Number(formData.get('parcelas_total')) : null,
    data_vencimento: String(formData.get('data_vencimento') || ''),
  };
}

function adicionarMeses(dataStr: string, meses: number): string {
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const data = new Date(ano, mes - 1 + meses, dia);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
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
  const dataPagamento = String(formData.get('data_pagamento') || '');
  const observacao = String(formData.get('observacao') || '').trim() || null;
  const contaId = String(formData.get('conta_id') || '') || null;

  if (!valorPagamento || valorPagamento <= 0) {
    return { error: 'Informe um valor de pagamento válido.' };
  }
  if (!dataPagamento) {
    return { error: 'Informe a data do pagamento.' };
  }
  if (!contaId) {
    return { error: 'Selecione a conta usada no pagamento.' };
  }

  const { data: divida } = await supabase
    .from('dividas')
    .select('descricao, categoria_id, valor_total, valor_pago, parcelas_total, parcelas_pagas, data_vencimento')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!divida) return { error: 'Dívida não encontrada.' };

  const novoValorPago = Number(divida.valor_pago) + valorPagamento;

  let parcelasPagas = divida.parcelas_pagas ?? 0;
  let dataVencimento = divida.data_vencimento;

  if (divida.parcelas_total) {
    const valorParcela = Number(divida.valor_total) / divida.parcelas_total;
    // pequena tolerância (1 centavo) pra evitar erro de arredondamento de ponto flutuante
    const novasParcelasPagas = Math.min(divida.parcelas_total, Math.floor((novoValorPago + 0.01) / valorParcela));
    const parcelasCompletadas = novasParcelasPagas - parcelasPagas;
    if (parcelasCompletadas > 0) {
      dataVencimento = adicionarMeses(dataVencimento, parcelasCompletadas);
    }
    parcelasPagas = novasParcelasPagas;
  }

  const { error: erroPagamento } = await supabase.from('pagamentos_dividas').insert({
    divida_id: id,
    user_id: user.id,
    valor: valorPagamento,
    data_pagamento: dataPagamento,
    observacao,
  });
  if (erroPagamento) return { error: erroPagamento.message };

  const { error } = await supabase
    .from('dividas')
    .update({
      valor_pago: novoValorPago,
      parcelas_pagas: parcelasPagas,
      data_vencimento: dataVencimento,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  const { error: erroTransacao } = await supabase.from('transacoes').insert({
    user_id: user.id,
    tipo: 'despesa',
    descricao: `Pagamento: ${divida.descricao}`,
    valor: valorPagamento,
    data: dataPagamento,
    categoria_id: divida.categoria_id,
    conta_id: contaId,
    pago: true,
  });
  if (erroTransacao) return { error: erroTransacao.message };

  revalidatePath('/dividas');
  revalidatePath('/dashboard');
  revalidatePath('/transacoes');
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
