'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';

export interface DividaFormState {
  error?: string;
}

function parseFormData(formData: FormData) {
  const semVencimento = formData.get('sem_vencimento') === 'on';
  const situacao: 'ativa' | 'standby' = String(formData.get('situacao') || 'ativa') === 'standby' ? 'standby' : 'ativa';
  return {
    descricao: String(formData.get('descricao') || '').trim(),
    credor: String(formData.get('credor') || '').trim() || null,
    categoria_id: String(formData.get('categoria_id') || '') || null,
    subcategoria_id: String(formData.get('subcategoria_id') || '') || null,
    valor_total: Number(formData.get('valor_total') || 0),
    parcelas_total: formData.get('parcelas_total') ? Number(formData.get('parcelas_total')) : null,
    sem_vencimento: semVencimento,
    data_vencimento: semVencimento ? null : String(formData.get('data_vencimento') || ''),
    situacao,
    observacoes: String(formData.get('observacoes') || '').trim() || null,
  };
}

const TIPOS = ['cartao_credito', 'limite_conta', 'emprestimo', 'consignado', 'financiamento', 'crediario', 'acordo', 'outros'];
const SITUACOES = ['em_dia', 'atrasada', 'negativada', 'protestada', 'cobranca_judicial', 'em_acordo'];

/** Detalhes de negociação (migração 0026). */
function parseDetalhes(formData: FormData) {
  const num = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    if (!v) return null;
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const tipo = String(formData.get('tipo_divida') || '');
  const sit = String(formData.get('situacao_credito') || '');
  const desconto = num('desconto_pct');
  return {
    valor_original: num('valor_original'),
    valor_atual: num('valor_atual'),
    tipo_divida: TIPOS.includes(tipo) ? tipo : null,
    situacao_credito: SITUACOES.includes(sit) ? sit : null,
    desconto_pct: desconto == null ? null : Math.max(0, Math.min(100, desconto)),
    taxa_juros_mensal: num('taxa_juros_mensal'),
    parcela_mensal: num('parcela_mensal'),
  };
}

/** Erro de coluna inexistente = migração 0026 ainda não aplicada. */
function faltaMigracaoDetalhes(msg: string | undefined): boolean {
  return !!msg && /(valor_original|valor_atual|tipo_divida|situacao_credito|desconto_pct|taxa_juros_mensal|parcela_mensal)/.test(msg);
}
const AVISO_MIGRACAO =
  'A dívida foi salva, mas tipo, situação, valor original/atual e desconto precisam da migração 0026_dividas_detalhes.sql no Supabase.';

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
  if (!dados.descricao || !dados.valor_total) {
    return { error: 'Preencha descrição e valor total.' };
  }
  if (!dados.sem_vencimento && !dados.data_vencimento) {
    return { error: 'Preencha o vencimento ou marque "Sem vencimento definido".' };
  }

  const gerarParcelas = formData.get('gerar_parcelas') === 'on';
  const contaParcelasId = String(formData.get('conta_parcelas_id') || '') || null;
  if (gerarParcelas && dados.sem_vencimento) {
    return { error: 'Não é possível gerar parcelas para uma dívida sem vencimento.' };
  }
  if (gerarParcelas && !contaParcelasId) {
    return { error: 'Selecione a conta para gerar as parcelas em Transações.' };
  }

  const detalhes = parseDetalhes(formData);
  let avisoMigracao = false;
  let { data: dividaCriada, error } = await supabase
    .from('dividas')
    .insert({ user_id: user.id, ...dados, ...detalhes })
    .select('id')
    .single();
  if (error && faltaMigracaoDetalhes(error.message)) {
    ({ data: dividaCriada, error } = await supabase.from('dividas').insert({ user_id: user.id, ...dados }).select('id').single());
    avisoMigracao = Object.values(detalhes).some((v) => v != null);
  }
  if (error || !dividaCriada) return { error: error?.message ?? 'Não foi possível criar a dívida.' };

  if (gerarParcelas && dados.data_vencimento) {
    const dataVencimentoBase = dados.data_vencimento;
    const parcelasTotal = dados.parcelas_total ?? 1;
    const valorParcela = dados.valor_total / parcelasTotal;
    const grupoParcelamento = parcelasTotal > 1 ? crypto.randomUUID() : null;
    const hoje = new Date().toISOString().slice(0, 10);

    const linhas = Array.from({ length: parcelasTotal }, (_, i) => {
      const vencimento = adicionarMeses(dataVencimentoBase, i);
      return {
        user_id: user.id,
        tipo: 'despesa' as const,
        descricao: parcelasTotal > 1 ? `${dados.descricao} (${i + 1}/${parcelasTotal})` : dados.descricao,
        valor: valorParcela,
        data: vencimento,
        data_registro: hoje,
        data_vencimento: vencimento,
        categoria_id: dados.categoria_id,
        subcategoria_id: dados.subcategoria_id,
        conta_id: contaParcelasId,
        pago: false,
        recorrente: parcelasTotal > 1,
        frequencia: parcelasTotal > 1 ? ('mensal' as const) : null,
        grupo_parcelamento: grupoParcelamento,
        parcela_atual: parcelasTotal > 1 ? i + 1 : null,
        parcela_total: parcelasTotal > 1 ? parcelasTotal : null,
        divida_id: dividaCriada.id,
      };
    });

    const { error: erroTransacoes } = await supabase.from('transacoes').insert(linhas);
    if (erroTransacoes) return { error: erroTransacoes.message };
    revalidatePath('/transacoes');
  }

  revalidatePath('/dividas');
  revalidatePath('/dashboard');
  return avisoMigracao ? { error: AVISO_MIGRACAO } : {};
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
  if (!dados.descricao || !dados.valor_total) {
    return { error: 'Preencha descrição e valor total.' };
  }
  if (!dados.sem_vencimento && !dados.data_vencimento) {
    return { error: 'Preencha o vencimento ou marque "Sem vencimento definido".' };
  }

  const detalhes = parseDetalhes(formData);
  let { error } = await supabase.from('dividas').update({ ...dados, ...detalhes }).eq('id', id).eq('user_id', user.id);
  let avisoMigracao = false;
  if (error && faltaMigracaoDetalhes(error.message)) {
    ({ error } = await supabase.from('dividas').update(dados).eq('id', id).eq('user_id', user.id));
    avisoMigracao = Object.values(detalhes).some((v) => v != null);
  }
  if (error) return { error: error.message };

  revalidatePath('/dividas');
  return avisoMigracao ? { error: AVISO_MIGRACAO } : {};
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
    .select(
      'descricao, categoria_id, subcategoria_id, valor_total, valor_pago, parcelas_total, parcelas_pagas, data_vencimento'
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!divida) return { error: 'Dívida não encontrada.' };

  const novoValorPago = Number(divida.valor_pago) + valorPagamento;

  let parcelasPagas = divida.parcelas_pagas ?? 0;
  let dataVencimento = divida.data_vencimento;

  if (divida.parcelas_total && dataVencimento) {
    const valorParcela = Number(divida.valor_total) / divida.parcelas_total;
    // pequena tolerância (1 centavo) pra evitar erro de arredondamento de ponto flutuante
    const novasParcelasPagas = Math.min(divida.parcelas_total, Math.floor((novoValorPago + 0.01) / valorParcela));
    const parcelasCompletadas = novasParcelasPagas - parcelasPagas;
    if (parcelasCompletadas > 0) {
      dataVencimento = adicionarMeses(dataVencimento, parcelasCompletadas);
    }
    parcelasPagas = novasParcelasPagas;
  }

  const { data: pagamento, error: erroPagamento } = await supabase
    .from('pagamentos_dividas')
    .insert({
      divida_id: id,
      user_id: user.id,
      valor: valorPagamento,
      data_pagamento: dataPagamento,
      observacao,
    })
    .select('id')
    .single();
  if (erroPagamento || !pagamento) return { error: erroPagamento?.message ?? 'Não foi possível registrar o pagamento.' };

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

  // Se já existe uma parcela pendente gerada para esta dívida com o mesmo valor,
  // reaproveita essa transação (marcando como paga) em vez de criar uma nova —
  // evita duplicar/"esconder" lançamentos quando a parcela original ainda existe em Transações.
  const { data: parcelaPendente } = await supabase
    .from('transacoes')
    .select('id, valor')
    .eq('user_id', user.id)
    .eq('divida_id', id)
    .eq('pago', false)
    .order('data', { ascending: true })
    .limit(1)
    .maybeSingle();

  const reaproveitarParcela = parcelaPendente && Math.abs(Number(parcelaPendente.valor) - valorPagamento) < 0.01;

  if (reaproveitarParcela) {
    const { error: erroAtualizacao } = await supabase
      .from('transacoes')
      .update({
        pago: true,
        data: dataPagamento,
        conta_id: contaId,
        pagamento_divida_id: pagamento.id,
      })
      .eq('id', parcelaPendente.id)
      .eq('user_id', user.id);
    if (erroAtualizacao) return { error: erroAtualizacao.message };
  } else {
    const { error: erroTransacao } = await supabase.from('transacoes').insert({
      user_id: user.id,
      tipo: 'despesa',
      descricao: `Pagamento: ${divida.descricao}`,
      valor: valorPagamento,
      data: dataPagamento,
      data_registro: dataPagamento,
      data_vencimento: dataPagamento,
      categoria_id: divida.categoria_id,
      subcategoria_id: divida.subcategoria_id,
      conta_id: contaId,
      pago: true,
      pagamento_divida_id: pagamento.id,
      divida_id: id,
    });
    if (erroTransacao) return { error: erroTransacao.message };
  }

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

/** Juros e parcela usados no plano de quitação (salvos ao editar na aba do plano). */
export async function salvarJurosParcela(id: string, taxa: number | null, parcela: number | null): Promise<{ error?: string }> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };
  if (taxa != null && (taxa < 0 || taxa > 100)) return { error: 'Juros inválidos.' };
  if (parcela != null && parcela < 0) return { error: 'Parcela inválida.' };
  const { error } = await supabase.from('dividas').update({ taxa_juros_mensal: taxa, parcela_mensal: parcela }).eq('id', id).eq('user_id', user.id);
  if (error) return { error: faltaMigracaoDetalhes(error.message) ? 'Rode a migração 0026_dividas_detalhes.sql no Supabase para salvar juros e parcela.' : error.message };
  revalidatePath('/dividas');
  return {};
}
