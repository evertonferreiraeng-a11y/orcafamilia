'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';

export async function salvarOrcamento(
  categoriaId: string,
  subcategoriaId: string | null,
  mesReferencia: string,
  valorLimite: number | null
): Promise<{ error?: string }> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  let busca = supabase
    .from('orcamentos')
    .select('id')
    .eq('user_id', user.id)
    .eq('categoria_id', categoriaId)
    .eq('mes_referencia', mesReferencia);
  busca = subcategoriaId ? busca.eq('subcategoria_id', subcategoriaId) : busca.is('subcategoria_id', null);
  const { data: existente } = await busca.maybeSingle();

  if (!valorLimite || valorLimite <= 0) {
    if (existente) {
      await supabase.from('orcamentos').delete().eq('id', existente.id).eq('user_id', user.id);
      revalidatePath('/orcamentos');
      revalidatePath('/dashboard');
    }
    return {};
  }

  if (existente) {
    const { error } = await supabase
      .from('orcamentos')
      .update({ valor_limite: valorLimite })
      .eq('id', existente.id)
      .eq('user_id', user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('orcamentos').insert({
      user_id: user.id,
      categoria_id: categoriaId,
      subcategoria_id: subcategoriaId,
      mes_referencia: mesReferencia,
      valor_limite: valorLimite,
    });
    if (error) return { error: error.message };
  }

  revalidatePath('/orcamentos');
  revalidatePath('/dashboard');
  return {};
}
