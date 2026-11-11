import type { createServerSupabase } from '@/lib/supabase-server';
import type { DadosEstoque } from '@/lib/estoque/calc';
import type { EstoqueConfig, EstoqueListaItem, EstoqueLocal, EstoqueLote, EstoqueMov, EstoqueProduto } from '@/types/database';

type Supa = ReturnType<typeof createServerSupabase>;
type Resp<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** O PostgREST devolve no máximo 1000 linhas por consulta: busca em páginas até acabar. */
export async function buscarTodos<T>(montar: (de: number, ate: number) => Resp<T>): Promise<T[]> {
  const passo = 1000;
  const out: T[] = [];
  for (let de = 0; ; de += passo) {
    const { data, error } = await montar(de, de + passo - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < passo) break;
  }
  return out;
}

/**
 * Carrega todo o estoque da família do usuário logado (a RLS filtra pela família).
 * Na primeira vez, cria o cadastro inicial (15 produtos, fórmula infantil e 5 locais).
 */
export async function carregarEstoque(supabase: Supa): Promise<DadosEstoque> {
  let { data: config } = await supabase.from('estoque_config').select('*').maybeSingle();
  if (!config) {
    const { error } = await (supabase as unknown as { rpc: (n: string) => PromiseLike<{ error: { message: string } | null }> }).rpc('estoque_inicializar');
    if (error) throw new Error(error.message);
    ({ data: config } = await supabase.from('estoque_config').select('*').maybeSingle());
  }
  if (!config) throw new Error('Não foi possível carregar a configuração do estoque.');

  const [locais, produtos, lotes, movs] = await Promise.all([
    buscarTodos<EstoqueLocal>((a, b) => supabase.from('estoque_locais').select('*').order('nome').range(a, b)),
    buscarTodos<EstoqueProduto>((a, b) => supabase.from('estoque_produtos').select('*').order('nome').range(a, b)),
    buscarTodos<EstoqueLote>((a, b) => supabase.from('estoque_lotes').select('*').order('criado_em').range(a, b)),
    buscarTodos<EstoqueMov>((a, b) => supabase.from('estoque_movs').select('*').order('data', { ascending: false }).order('criado_em', { ascending: false }).range(a, b)),
  ]);

  // lista de compras (migração 0021): se a tabela ainda não existir, a tela avisa
  const lista = await buscarTodos<EstoqueListaItem>((a, b) => supabase.from('estoque_lista').select('*').order('criado_em').range(a, b)).catch(() => null);

  // numeric do Postgres pode chegar como string em alguns drivers: normaliza
  const n = (v: unknown) => (v === null || v === undefined ? v : Number(v)) as number;
  return {
    config: { ...(config as EstoqueConfig), orc_min: n(config.orc_min), orc_max: n(config.orc_max) },
    locais,
    produtos: produtos.map((p) => ({ ...p, meta: n(p.meta), minimo: n(p.minimo), preco_ref: n(p.preco_ref), cap: p.cap === null ? null : n(p.cap) })),
    lotes: lotes.map((l) => ({ ...l, qtd_inicial: n(l.qtd_inicial), qtd_atual: n(l.qtd_atual), valor: n(l.valor), cap: l.cap === null ? null : n(l.cap) })),
    movs: movs.map((m) => ({ ...m, qtd: n(m.qtd), valor: n(m.valor) })),
    lista,
  };
}
