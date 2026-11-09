import type { createServerSupabase } from '@/lib/supabase-server';
import { buscarTodos } from '@/lib/estoque/carregar';
import type { DadosCasa } from '@/lib/casa/calc';
import type { CasaConfig, CasaExecucao, CasaItem, CasaPrestador, CasaTarefa } from '@/types/database';

type Supa = ReturnType<typeof createServerSupabase>;

/** Carrega os dados da casa da família (RLS). Na primeira vez cria as manutenções sugeridas. */
export async function carregarCasa(supabase: Supa): Promise<DadosCasa> {
  let { data: config } = await supabase.from('casa_config').select('*').maybeSingle();
  if (!config) {
    const { error } = await (supabase as unknown as { rpc: (n: string) => PromiseLike<{ error: { message: string } | null }> }).rpc('casa_inicializar');
    if (error) throw new Error(error.message);
    ({ data: config } = await supabase.from('casa_config').select('*').maybeSingle());
  }
  if (!config) throw new Error('Não foi possível carregar a configuração da casa.');

  const [prestadores, itens, tarefas, execucoes] = await Promise.all([
    buscarTodos<CasaPrestador>((a, b) => supabase.from('casa_prestadores').select('*').order('nome').range(a, b)),
    buscarTodos<CasaItem>((a, b) => supabase.from('casa_itens').select('*').order('nome').range(a, b)),
    buscarTodos<CasaTarefa>((a, b) => supabase.from('casa_tarefas').select('*').order('titulo').range(a, b)),
    buscarTodos<CasaExecucao>((a, b) => supabase.from('casa_execucoes').select('*').order('data', { ascending: false }).order('criado_em', { ascending: false }).range(a, b)),
  ]);
  const n = (v: unknown) => Number(v) || 0;
  return {
    config: config as CasaConfig,
    prestadores,
    itens: itens.map((i) => ({ ...i, valor: n(i.valor) })),
    tarefas: tarefas.map((t) => ({ ...t, freq_valor: n(t.freq_valor), aviso_dias: n(t.aviso_dias), custo_estimado: n(t.custo_estimado) })),
    execucoes: execucoes.map((e) => ({ ...e, custo: n(e.custo) })),
  };
}
