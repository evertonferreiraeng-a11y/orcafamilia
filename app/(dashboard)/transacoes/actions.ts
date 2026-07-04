'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';

export interface TransacaoFormState {
  error?: string;
}

type Aba = 'despesa' | 'receita' | 'transferencia';

function adicionarMeses(dataStr: string, meses: number): string {
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const data = new Date(ano, mes - 1 + meses, dia);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

async function getUser() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function criarTransacao(_prevState: TransacaoFormState, formData: FormData): Promise<TransacaoFormState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const aba = String(formData.get('aba') || 'despesa') as Aba;
  const valor = Number(formData.get('valor') || 0);
  const data = String(formData.get('data') || '');

  if (!valor || !data) return { error: 'Preencha valor e data.' };

  if (aba === 'transferencia') {
    const contaOrigemId = String(formData.get('conta_origem_id') || '');
    const contaDestinoId = String(formData.get('conta_destino_id') || '');

    if (!contaOrigemId || !contaDestinoId) return { error: 'Selecione as contas de origem e destino.' };
    if (contaOrigemId === contaDestinoId) return { error: 'As contas de origem e destino devem ser diferentes.' };

    const [{ data: contaOrigem }, { data: contaDestino }] = await Promise.all([
      supabase.from('contas').select('nome').eq('id', contaOrigemId).eq('user_id', user.id).single(),
      supabase.from('contas').select('nome').eq('id', contaDestinoId).eq('user_id', user.id).single(),
    ]);

    const grupoTransferencia = crypto.randomUUID();

    const { error } = await supabase.from('transacoes').insert([
      {
        user_id: user.id,
        tipo: 'despesa',
        descricao: `Transferência para ${contaDestino?.nome ?? 'conta'}`,
        valor,
        data,
        conta_id: contaOrigemId,
        categoria_id: null,
        pago: true,
        eh_transferencia: true,
        grupo_transferencia: grupoTransferencia,
      },
      {
        user_id: user.id,
        tipo: 'receita',
        descricao: `Transferência de ${contaOrigem?.nome ?? 'conta'}`,
        valor,
        data,
        conta_id: contaDestinoId,
        categoria_id: null,
        pago: true,
        eh_transferencia: true,
        grupo_transferencia: grupoTransferencia,
      },
    ]);
    if (error) return { error: error.message };

    revalidatePath('/transacoes');
    revalidatePath('/dashboard');
    return {};
  }

  const descricao = String(formData.get('descricao') || '').trim();
  const categoriaId = String(formData.get('categoria_id') || '') || null;
  const subcategoriaId = String(formData.get('subcategoria_id') || '') || null;
  const pago = formData.get('pago') === 'on';
  const contaId = String(formData.get('conta_id') || '') || null;
  const cartaoId = String(formData.get('cartao_id') || '') || null;
  const recorrente = formData.get('recorrente') === 'on';
  const mesesRecorrencia = recorrente ? Math.max(2, Math.min(60, Number(formData.get('meses_recorrencia') || 2))) : 1;

  if (!descricao || !valor || !data || !categoriaId) {
    return { error: 'Preencha descrição, valor, data e categoria.' };
  }
  if (!contaId && !cartaoId) {
    return { error: 'Selecione uma conta ou cartão.' };
  }

  const grupoParcelamento = mesesRecorrencia > 1 ? crypto.randomUUID() : null;

  const linhas = Array.from({ length: mesesRecorrencia }, (_, i) => ({
    user_id: user.id,
    tipo: aba,
    descricao,
    valor,
    data: adicionarMeses(data, i),
    categoria_id: categoriaId,
    subcategoria_id: subcategoriaId,
    conta_id: contaId,
    cartao_id: cartaoId,
    pago: i === 0 ? pago : false,
    recorrente: mesesRecorrencia > 1,
    frequencia: mesesRecorrencia > 1 ? ('mensal' as const) : null,
    grupo_parcelamento: grupoParcelamento,
    parcela_atual: mesesRecorrencia > 1 ? i + 1 : null,
    parcela_total: mesesRecorrencia > 1 ? mesesRecorrencia : null,
  }));

  const { error } = await supabase.from('transacoes').insert(linhas);
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
  const { supabase, user } = await getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const aba = String(formData.get('aba') || 'despesa') as Aba;
  const valor = Number(formData.get('valor') || 0);
  const data = String(formData.get('data') || '');

  if (!valor || !data) return { error: 'Preencha valor e data.' };

  if (aba === 'transferencia') {
    const { data: linhaAtual } = await supabase
      .from('transacoes')
      .select('grupo_transferencia')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!linhaAtual?.grupo_transferencia) return { error: 'Transferência inválida.' };

    const contaOrigemId = String(formData.get('conta_origem_id') || '');
    const contaDestinoId = String(formData.get('conta_destino_id') || '');
    if (!contaOrigemId || !contaDestinoId) return { error: 'Selecione as contas de origem e destino.' };

    const [{ error: erroOrigem }, { error: erroDestino }] = await Promise.all([
      supabase
        .from('transacoes')
        .update({ valor, data, conta_id: contaOrigemId })
        .eq('grupo_transferencia', linhaAtual.grupo_transferencia)
        .eq('tipo', 'despesa')
        .eq('user_id', user.id),
      supabase
        .from('transacoes')
        .update({ valor, data, conta_id: contaDestinoId })
        .eq('grupo_transferencia', linhaAtual.grupo_transferencia)
        .eq('tipo', 'receita')
        .eq('user_id', user.id),
    ]);
    if (erroOrigem || erroDestino) return { error: (erroOrigem ?? erroDestino)?.message };

    revalidatePath('/transacoes');
    revalidatePath('/dashboard');
    return {};
  }

  const descricao = String(formData.get('descricao') || '').trim();
  const categoriaId = String(formData.get('categoria_id') || '') || null;
  const subcategoriaId = String(formData.get('subcategoria_id') || '') || null;
  const pago = formData.get('pago') === 'on';
  const contaId = String(formData.get('conta_id') || '') || null;
  const cartaoId = String(formData.get('cartao_id') || '') || null;

  if (!descricao || !valor || !data || !categoriaId) {
    return { error: 'Preencha descrição, valor, data e categoria.' };
  }
  if (!contaId && !cartaoId) {
    return { error: 'Selecione uma conta ou cartão.' };
  }

  const { error } = await supabase
    .from('transacoes')
    .update({
      tipo: aba,
      descricao,
      valor,
      data,
      categoria_id: categoriaId,
      subcategoria_id: subcategoriaId,
      conta_id: contaId,
      cartao_id: cartaoId,
      pago,
    })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
  return {};
}

export async function alternarPagoTransacao(id: string, pago: boolean): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from('transacoes').update({ pago }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
}

export async function excluirTransacao(id: string): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user) return;

  const { data: linha } = await supabase
    .from('transacoes')
    .select('grupo_transferencia')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (linha?.grupo_transferencia) {
    await supabase.from('transacoes').delete().eq('grupo_transferencia', linha.grupo_transferencia).eq('user_id', user.id);
  } else {
    await supabase.from('transacoes').delete().eq('id', id).eq('user_id', user.id);
  }

  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
}
