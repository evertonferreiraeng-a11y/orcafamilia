'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';
import { resolverValorEfetivo } from '@/lib/orcamentos';

type SupabaseClient = ReturnType<typeof createServerSupabase>;

async function salvarOrcamentoMes(
  supabase: SupabaseClient,
  userId: string,
  categoriaId: string,
  subcategoriaId: string | null,
  mesReferencia: string,
  valorLimite: number | null
): Promise<{ error?: string }> {
  let busca = supabase
    .from('orcamentos')
    .select('id')
    .eq('user_id', userId)
    .eq('categoria_id', categoriaId)
    .eq('mes_referencia', mesReferencia);
  busca = subcategoriaId ? busca.eq('subcategoria_id', subcategoriaId) : busca.is('subcategoria_id', null);
  const { data: existente } = await busca.maybeSingle();

  if (!valorLimite || valorLimite <= 0) {
    if (existente) {
      await supabase.from('orcamentos').delete().eq('id', existente.id).eq('user_id', userId);
    }
    return {};
  }

  if (existente) {
    const { error } = await supabase
      .from('orcamentos')
      .update({ valor_limite: valorLimite })
      .eq('id', existente.id)
      .eq('user_id', userId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('orcamentos').insert({
      user_id: userId,
      categoria_id: categoriaId,
      subcategoria_id: subcategoriaId,
      mes_referencia: mesReferencia,
      valor_limite: valorLimite,
    });
    if (error) return { error: error.message };
  }

  return {};
}

async function sincronizarTotalCategoria(
  supabase: SupabaseClient,
  userId: string,
  categoriaId: string,
  mesReferencia: string
): Promise<{ error?: string }> {
  const { data: subLinhas } = await supabase
    .from('orcamentos')
    .select('valor_limite')
    .eq('user_id', userId)
    .eq('categoria_id', categoriaId)
    .eq('mes_referencia', mesReferencia)
    .not('subcategoria_id', 'is', null);

  const soma = (subLinhas ?? []).reduce((a, o) => a + Number(o.valor_limite), 0);
  return salvarOrcamentoMes(supabase, userId, categoriaId, null, mesReferencia, soma > 0 ? soma : null);
}

export async function salvarOrcamento(
  categoriaId: string,
  subcategoriaId: string | null,
  mesesReferencia: string[],
  valorLimite: number | null
): Promise<{ error?: string }> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  for (const mesAlvo of mesesReferencia) {
    const resultado = await salvarOrcamentoMes(supabase, user.id, categoriaId, subcategoriaId, mesAlvo, valorLimite);
    if (resultado.error) return resultado;
    if (subcategoriaId) {
      const sincronizacao = await sincronizarTotalCategoria(supabase, user.id, categoriaId, mesAlvo);
      if (sincronizacao.error) return sincronizacao;
    }
  }

  revalidatePath('/orcamentos');
  revalidatePath('/dashboard');
  revalidatePath('/indicadores');
  return {};
}

export async function copiarOrcamentoAno(
  anoOrigem: number,
  anoDestino: number
): Promise<{ error?: string; copiados?: number }> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data: linhasOrigem, error: erroBusca } = await supabase
    .from('orcamentos')
    .select('categoria_id, subcategoria_id, mes_referencia, valor_limite')
    .eq('user_id', user.id)
    .gte('mes_referencia', `${anoOrigem}-01-01`)
    .lte('mes_referencia', `${anoOrigem}-12-01`);

  if (erroBusca) return { error: erroBusca.message };
  if (!linhasOrigem || linhasOrigem.length === 0) {
    return { error: `Não encontrei orçamentos lançados em ${anoOrigem} para copiar.` };
  }

  for (const linha of linhasOrigem) {
    const mesDestino = `${anoDestino}${linha.mes_referencia.slice(4)}`;
    const resultado = await salvarOrcamentoMes(
      supabase,
      user.id,
      linha.categoria_id,
      linha.subcategoria_id,
      mesDestino,
      Number(linha.valor_limite)
    );
    if (resultado.error) return resultado;
  }

  revalidatePath('/orcamentos');
  revalidatePath('/dashboard');
  revalidatePath('/indicadores');
  return { copiados: linhasOrigem.length };
}

export async function limparOrcamentos(ano: number, mesIndex: number | null): Promise<{ error?: string }> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  let query = supabase.from('orcamentos').delete().eq('user_id', user.id);
  if (mesIndex != null) {
    const mesReferencia = `${ano}-${String(mesIndex + 1).padStart(2, '0')}-01`;
    query = query.eq('mes_referencia', mesReferencia);
  } else {
    query = query.gte('mes_referencia', `${ano}-01-01`).lte('mes_referencia', `${ano}-12-01`);
  }

  const { error } = await query;
  if (error) return { error: error.message };

  revalidatePath('/orcamentos');
  revalidatePath('/dashboard');
  revalidatePath('/indicadores');
  return {};
}

export interface ItemOrcamentoLote {
  categoriaId: string;
  subcategoriaId: string | null;
  mesesReferencia: string[];
  valorLimite: number | null;
}

/**
 * Salva vários valores de uma vez (usado pela aba "Planejar mês").
 * Os totais de categoria com subcategorias são ressincronizados uma única
 * vez por categoria/mês no final, em vez de a cada subcategoria.
 */
export async function salvarOrcamentosLote(itens: ItemOrcamentoLote[]): Promise<{ error?: string }> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const paraSincronizar = new Set<string>();
  for (const item of itens) {
    for (const mesAlvo of item.mesesReferencia) {
      const resultado = await salvarOrcamentoMes(
        supabase,
        user.id,
        item.categoriaId,
        item.subcategoriaId,
        mesAlvo,
        item.valorLimite
      );
      if (resultado.error) return resultado;
      if (item.subcategoriaId) paraSincronizar.add(`${item.categoriaId}|${mesAlvo}`);
    }
  }

  for (const chave of Array.from(paraSincronizar)) {
    const [categoriaId, mesAlvo] = chave.split('|');
    const sincronizacao = await sincronizarTotalCategoria(supabase, user.id, categoriaId, mesAlvo);
    if (sincronizacao.error) return sincronizacao;
  }

  revalidatePath('/orcamentos');
  revalidatePath('/dashboard');
  revalidatePath('/indicadores');
  return {};
}

export interface LancamentoCategoria {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  subcategoria_id: string | null;
  pago: boolean | null;
}

/** Lançamentos de uma categoria num mês — usado no detalhe do card de orçamento. */
export async function buscarLancamentosCategoria(
  categoriaId: string,
  ano: number,
  mesIndex: number
): Promise<{ error?: string; lancamentos?: LancamentoCategoria[] }> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const inicio = `${ano}-${String(mesIndex + 1).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mesIndex + 1, 0).getDate();
  const fim = `${ano}-${String(mesIndex + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('transacoes')
    .select('id, descricao, valor, data, subcategoria_id, pago')
    .eq('user_id', user.id)
    .eq('categoria_id', categoriaId)
    .eq('eh_transferencia', false)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: false });

  if (error) return { error: error.message };
  return { lancamentos: (data ?? []).map((t) => ({ ...t, valor: Number(t.valor) })) };
}

export interface ResumoOrcamentoLancamento {
  categoria: { orcado: number; usado: number; temSubcategorias: boolean };
  subcategoria: { orcado: number; usado: number } | null;
}

/**
 * Orçado e utilizado de uma categoria (e subcategoria) num mês — usado no formulário
 * de transação para mostrar quanto ainda está disponível antes de lançar.
 * `excluirTransacaoId` tira a própria transação da conta ao editar.
 */
export async function resumoOrcamentoLancamento(
  categoriaId: string,
  subcategoriaId: string | null,
  mesRef: string, // yyyy-MM
  excluirTransacaoId?: string
): Promise<{ error?: string; resumo?: ResumoOrcamentoLancamento }> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const [ano, mes] = mesRef.split('-').map(Number);
  if (!ano || !mes) return { error: 'Mês inválido.' };
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(new Date(ano, mes, 0).getDate()).padStart(2, '0')}`;

  const [{ data: orcs, error: e1 }, { data: subs, error: e2 }, { data: trans, error: e3 }] = await Promise.all([
    supabase
      .from('orcamentos')
      .select('subcategoria_id, valor_limite')
      .eq('user_id', user.id)
      .eq('categoria_id', categoriaId)
      .eq('mes_referencia', inicio),
    supabase.from('subcategorias').select('id').eq('categoria_id', categoriaId),
    supabase
      .from('transacoes')
      .select('id, valor, subcategoria_id')
      .eq('user_id', user.id)
      .eq('categoria_id', categoriaId)
      .eq('eh_transferencia', false)
      .gte('data', inicio)
      .lte('data', fim),
  ]);
  const erro = e1 ?? e2 ?? e3;
  if (erro) return { error: erro.message };

  const temSub = (subs ?? []).length > 0;
  const linhaCategoria = (orcs ?? []).find((o) => !o.subcategoria_id);
  const somaSubs = (orcs ?? []).filter((o) => o.subcategoria_id).reduce((a, o) => a + Number(o.valor_limite ?? 0), 0);
  const orcadoCategoria = resolverValorEfetivo(temSub, linhaCategoria ? Number(linhaCategoria.valor_limite ?? 0) : null, somaSubs);

  const validas = (trans ?? []).filter((t) => t.id !== excluirTransacaoId);
  const usadoCategoria = validas.reduce((a, t) => a + Number(t.valor), 0);

  let subcategoria: ResumoOrcamentoLancamento['subcategoria'] = null;
  if (subcategoriaId) {
    const linhaSub = (orcs ?? []).find((o) => o.subcategoria_id === subcategoriaId);
    subcategoria = {
      orcado: linhaSub ? Number(linhaSub.valor_limite ?? 0) : 0,
      usado: validas.filter((t) => t.subcategoria_id === subcategoriaId).reduce((a, t) => a + Number(t.valor), 0),
    };
  }

  return {
    resumo: {
      categoria: { orcado: orcadoCategoria, usado: usadoCategoria, temSubcategorias: temSub },
      subcategoria,
    },
  };
}
