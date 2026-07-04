import { createServerSupabase } from '@/lib/supabase-server';
import { parseMesParam, primeiroDiaMes, ultimoDiaMes } from '@/lib/utils';
import { OrcamentosClient, type OrcamentoComGasto } from '@/components/orcamentos/OrcamentosClient';

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const mesSelecionado = parseMesParam(searchParams.mes);
  const mesReferencia = primeiroDiaMes(mesSelecionado);
  const inicio = mesReferencia;
  const fim = ultimoDiaMes(mesSelecionado);

  const [{ data: categoriasDespesa }, { data: orcamentos }, { data: transacoes }] = await Promise.all([
    supabase.from('categorias').select('*').eq('user_id', user.id).eq('tipo', 'despesa').order('nome'),
    supabase
      .from('orcamentos')
      .select('*, categorias(nome, cor)')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesReferencia),
    supabase
      .from('transacoes')
      .select('categoria_id, valor')
      .eq('user_id', user.id)
      .eq('tipo', 'despesa')
      .eq('eh_transferencia', false)
      .gte('data', inicio)
      .lte('data', fim),
  ]);

  const gastoPorCategoria = new Map<string, number>();
  for (const t of transacoes ?? []) {
    if (!t.categoria_id) continue;
    gastoPorCategoria.set(t.categoria_id, (gastoPorCategoria.get(t.categoria_id) ?? 0) + Number(t.valor));
  }

  const orcamentosComGasto: OrcamentoComGasto[] = (orcamentos ?? []).map((o) => {
    const categoria = o.categorias as unknown as { nome: string; cor: string | null } | null;
    return {
      id: o.id,
      categoriaId: o.categoria_id,
      categoriaNome: categoria?.nome ?? 'Sem categoria',
      categoriaCor: categoria?.cor ?? null,
      valorLimite: Number(o.valor_limite),
      gasto: gastoPorCategoria.get(o.categoria_id) ?? 0,
    };
  });

  const categoriasComOrcamento = new Set((orcamentos ?? []).map((o) => o.categoria_id));
  const categoriasSemOrcamento = (categoriasDespesa ?? []).filter((c) => !categoriasComOrcamento.has(c.id));

  return (
    <OrcamentosClient
      orcamentos={orcamentosComGasto}
      categoriasSemOrcamento={categoriasSemOrcamento}
      mesReferencia={mesReferencia}
    />
  );
}
