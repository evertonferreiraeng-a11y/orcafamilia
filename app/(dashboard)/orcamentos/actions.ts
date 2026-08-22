'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';

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
