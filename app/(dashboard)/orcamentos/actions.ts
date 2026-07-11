'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';
import { addMeses, primeiroDiaMes } from '@/lib/utils';

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
  mesReferencia: string,
  valorLimite: number | null,
  mesesAFrente: number = 1
): Promise<{ error?: string }> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const mesBase = new Date(`${mesReferencia}T00:00:00`);
  const total = Math.max(1, Math.min(36, mesesAFrente));

  for (let i = 0; i < total; i++) {
    const mesAlvo = primeiroDiaMes(addMeses(mesBase, i));
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
