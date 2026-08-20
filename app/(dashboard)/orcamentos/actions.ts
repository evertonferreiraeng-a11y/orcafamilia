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
 * Preenche automaticamente as categorias/subcategorias de despesa que ainda
 * não têm orçamento definido em algum mês do ano informado, usando como base
 * a média das receitas pagas nos últimos 3 meses. Categorias com
 * subcategorias são sugeridas por subcategoria (única forma editável no
 * grid — o total da categoria é sempre a soma delas). Nunca sobrescreve
 * valores já definidos pelo usuário — só preenche o que está vazio.
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
    supabase.from('subcategorias').select('id, nome, categoria_id').eq('user_id', user.id),
    supabase
      .from('orcamentos')
      .select('categoria_id, subcategoria_id, mes_referencia')
      .eq('user_id', user.id)
      .gte('mes_referencia', `${ano}-01-01`)
      .lte('mes_referencia', `${ano}-12-01`),
  ]);

  const subcategoriasPorCategoria = new Map<string, { id: string; nome: string }[]>();
  for (const s of subcategoriasTodas ?? []) {
    const lista = subcategoriasPorCategoria.get(s.categoria_id) ?? [];
    lista.push({ id: s.id, nome: s.nome });
    subcategoriasPorCategoria.set(s.categoria_id, lista);
  }

  const jaDefinidos = new Set(
    (orcamentosAno ?? []).map((o) => `${o.categoria_id}:${o.subcategoria_id ?? 'null'}:${o.mes_referencia}`)
  );

  // Categorias sem subcategoria são orçadas no próprio nível; categorias com
  // subcategoria só são editáveis por subcategoria (o total da categoria é
  // sempre a soma delas), então o alvo da sugestão precisa descer um nível.
  const alvos = (categoriasDespesa ?? []).flatMap((categoria) => {
    const subs = subcategoriasPorCategoria.get(categoria.id) ?? [];
    if (subs.length === 0) {
      return [{ categoriaId: categoria.id, subcategoriaId: null as string | null, nome: categoria.nome }];
    }
    return subs.map((s) => ({ categoriaId: categoria.id, subcategoriaId: s.id as string | null, nome: s.nome }));
  });

  const linhas = alvos.flatMap((alvo) => {
    const valorSugerido = valorOrcamentoSugerido(alvo.nome, rendaBase);
    return Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}-01`)
      .filter((mesReferencia) => !jaDefinidos.has(`${alvo.categoriaId}:${alvo.subcategoriaId ?? 'null'}:${mesReferencia}`))
      .map((mesReferencia) => ({
        user_id: user.id,
        categoria_id: alvo.categoriaId,
        subcategoria_id: alvo.subcategoriaId,
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

export interface AjusteOrcamentoResultado {
  error?: string;
  apagados?: number;
  replicados?: number;
}

/**
 * Ajuste pontual: apaga o orçamento de janeiro até o mês anterior a
 * `mesCorte` no ano `ano` (não faz sentido orçar meses já passados), e usa o
 * orçamento de `mesCorte` como modelo mensal para preencher/atualizar os 12
 * meses de `anoReplicar`.
 */
export async function ajustarOrcamentoAPartirDoMes(
  ano: number,
  mesCorte: number,
  anoReplicar: number
): Promise<AjusteOrcamentoResultado> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const mesCorteRef = `${ano}-${String(mesCorte).padStart(2, '0')}-01`;

  const { data: apagados, error: erroApagar } = await supabase
    .from('orcamentos')
    .delete()
    .eq('user_id', user.id)
    .gte('mes_referencia', `${ano}-01-01`)
    .lt('mes_referencia', mesCorteRef)
    .select('id');
  if (erroApagar) return { error: erroApagar.message };

  const { data: modelo } = await supabase
    .from('orcamentos')
    .select('categoria_id, subcategoria_id, valor_limite')
    .eq('user_id', user.id)
    .eq('mes_referencia', mesCorteRef);

  if (!modelo || modelo.length === 0) {
    return {
      apagados: apagados?.length ?? 0,
      replicados: 0,
      error: `Nenhum orçamento encontrado em ${mesCorteRef} para usar como modelo em ${anoReplicar}.`,
    };
  }

  const { data: existentesReplica } = await supabase
    .from('orcamentos')
    .select('id, categoria_id, subcategoria_id, mes_referencia')
    .eq('user_id', user.id)
    .gte('mes_referencia', `${anoReplicar}-01-01`)
    .lte('mes_referencia', `${anoReplicar}-12-01`);

  const idExistentePorChave = new Map(
    (existentesReplica ?? []).map((o) => [`${o.categoria_id}:${o.subcategoria_id ?? 'null'}:${o.mes_referencia}`, o.id])
  );

  const novasLinhas: {
    user_id: string;
    categoria_id: string;
    subcategoria_id: string | null;
    mes_referencia: string;
    valor_limite: number;
  }[] = [];
  const atualizacoes: { id: string; valor_limite: number }[] = [];

  for (const linha of modelo) {
    for (let mes = 1; mes <= 12; mes++) {
      const mesRef = `${anoReplicar}-${String(mes).padStart(2, '0')}-01`;
      const chave = `${linha.categoria_id}:${linha.subcategoria_id ?? 'null'}:${mesRef}`;
      const idExistente = idExistentePorChave.get(chave);
      if (idExistente) {
        atualizacoes.push({ id: idExistente, valor_limite: Number(linha.valor_limite) });
      } else {
        novasLinhas.push({
          user_id: user.id,
          categoria_id: linha.categoria_id,
          subcategoria_id: linha.subcategoria_id,
          mes_referencia: mesRef,
          valor_limite: Number(linha.valor_limite),
        });
      }
    }
  }

  if (novasLinhas.length > 0) {
    const { error } = await supabase.from('orcamentos').insert(novasLinhas);
    if (error) return { error: error.message };
  }
  for (const atualizacao of atualizacoes) {
    const { error } = await supabase
      .from('orcamentos')
      .update({ valor_limite: atualizacao.valor_limite })
      .eq('id', atualizacao.id)
      .eq('user_id', user.id);
    if (error) return { error: error.message };
  }

  revalidatePath('/orcamentos');
  revalidatePath('/dashboard');
  revalidatePath('/indicadores');

  return { apagados: apagados?.length ?? 0, replicados: novasLinhas.length + atualizacoes.length };
}
