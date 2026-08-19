'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';
import { addMeses, primeiroDiaMes } from '@/lib/utils';
import { valorOrcamentoSugerido } from '@/lib/orcamentoSugestao';

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

export interface SugestaoOrcamentoResultado {
  error?: string;
  preenchidos?: number;
  rendaBase?: number;
}

const MESES_JANELA_RENDA = 3;

/**
 * Preenche automaticamente as categorias de despesa que ainda não têm
 * orçamento definido em nenhum mês do ano informado, usando como base a
 * média das receitas pagas nos últimos 3 meses. Nunca sobrescreve valores
 * já definidos pelo usuário — só preenche o que está vazio.
 */
export async function sugerirOrcamentosVazios(ano: number): Promise<SugestaoOrcamentoResultado> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const hoje = new Date();
  const inicioJanela = primeiroDiaMes(addMeses(hoje, -(MESES_JANELA_RENDA - 1)));
  const fimJanela = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  const { data: receitas } = await supabase
    .from('transacoes')
    .select('valor')
    .eq('user_id', user.id)
    .eq('tipo', 'receita')
    .eq('pago', true)
    .eq('eh_transferencia', false)
    .gte('data', inicioJanela)
    .lte('data', fimJanela);

  const rendaBase = (receitas ?? []).reduce((a, t) => a + Number(t.valor), 0) / MESES_JANELA_RENDA;

  if (rendaBase <= 0) {
    return { error: 'Não encontrei receitas pagas nos últimos meses para calcular uma sugestão. Cadastre suas receitas primeiro.' };
  }

  const [{ data: categoriasDespesa }, { data: subcategoriasTodas }, { data: orcamentosAno }] = await Promise.all([
    supabase.from('categorias').select('id, nome').eq('user_id', user.id).eq('tipo', 'despesa'),
    supabase.from('subcategorias').select('categoria_id').eq('user_id', user.id),
    supabase
      .from('orcamentos')
      .select('categoria_id, mes_referencia')
      .eq('user_id', user.id)
      .is('subcategoria_id', null)
      .gte('mes_referencia', `${ano}-01-01`)
      .lte('mes_referencia', `${ano}-12-01`),
  ]);

  const categoriasComSubcategoria = new Set((subcategoriasTodas ?? []).map((s) => s.categoria_id));
  const jaDefinidos = new Set((orcamentosAno ?? []).map((o) => `${o.categoria_id}:${o.mes_referencia}`));

  const linhas = (categoriasDespesa ?? [])
    .filter((categoria) => !categoriasComSubcategoria.has(categoria.id))
    .flatMap((categoria) => {
      const valorSugerido = valorOrcamentoSugerido(categoria.nome, rendaBase);
      return Array.from({ length: 12 }, (_, i) => i + 1)
        .map((mes) => `${ano}-${String(mes).padStart(2, '0')}-01`)
        .filter((mesReferencia) => !jaDefinidos.has(`${categoria.id}:${mesReferencia}`))
        .map((mesReferencia) => ({
          user_id: user.id,
          categoria_id: categoria.id,
          subcategoria_id: null,
          mes_referencia: mesReferencia,
          valor_limite: valorSugerido,
        }));
    });

  if (linhas.length > 0) {
    const { error } = await supabase.from('orcamentos').insert(linhas);
    if (error) return { error: error.message };
  }

  revalidatePath('/orcamentos');
  revalidatePath('/dashboard');
  revalidatePath('/indicadores');
  return { preenchidos: linhas.length, rendaBase };
}
