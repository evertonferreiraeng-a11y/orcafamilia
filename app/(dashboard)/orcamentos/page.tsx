import { createServerSupabase } from '@/lib/supabase-server';
import { OrcamentosClient, type CategoriaAnual } from '@/components/orcamentos/OrcamentosClient';

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: { ano?: string };
}) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const anoAtual = new Date().getFullYear();
  const ano = searchParams.ano ? Number(searchParams.ano) : anoAtual;

  const [{ data: categoriasTodas }, { data: subcategoriasTodas }, { data: orcamentosAno }, { data: transacoesAno }] =
    await Promise.all([
      supabase.from('categorias').select('id, nome, tipo, cor').eq('user_id', user.id).order('nome'),
      supabase.from('subcategorias').select('id, nome, categoria_id').eq('user_id', user.id).order('nome'),
      supabase
        .from('orcamentos')
        .select('categoria_id, subcategoria_id, valor_limite, mes_referencia')
        .eq('user_id', user.id)
        .gte('mes_referencia', `${ano - 1}-12-01`)
        .lte('mes_referencia', `${ano}-12-01`),
      supabase
        .from('transacoes')
        .select('categoria_id, subcategoria_id, valor, data')
        .eq('user_id', user.id)
        .eq('eh_transferencia', false)
        .gte('data', `${ano - 1}-10-01`)
        .lte('data', `${ano}-12-31`),
    ]);

  // mesIndex -1 = dezembro do ano anterior (usado para "copiar mês anterior" em janeiro)
  function buscarLimite(categoriaId: string, subcategoriaId: string | null, mesIndex: number): number | null {
    const mesRef = mesIndex < 0 ? `${ano - 1}-12-01` : `${ano}-${String(mesIndex + 1).padStart(2, '0')}-01`;
    const linha = (orcamentosAno ?? []).find(
      (o) =>
        o.categoria_id === categoriaId &&
        o.mes_referencia === mesRef &&
        (subcategoriaId ? o.subcategoria_id === subcategoriaId : !o.subcategoria_id)
    );
    return linha ? Number(linha.valor_limite) : null;
  }

  const execPorCategoriaMes = new Map<string, number>();
  const execPorSubcategoriaMes = new Map<string, number>();
  for (const t of transacoesAno ?? []) {
    if (!t.categoria_id) continue;
    // Índices -3..-1 = out..dez do ano anterior (histórico para média de 3 meses)
    const mesIndex = Number(t.data.slice(0, 4)) < ano ? Number(t.data.slice(5, 7)) - 13 : Number(t.data.slice(5, 7)) - 1;
    const chaveCategoria = `${t.categoria_id}-${mesIndex}`;
    execPorCategoriaMes.set(chaveCategoria, (execPorCategoriaMes.get(chaveCategoria) ?? 0) + Number(t.valor));
    if (t.subcategoria_id) {
      const chaveSubcategoria = `${t.subcategoria_id}-${mesIndex}`;
      execPorSubcategoriaMes.set(chaveSubcategoria, (execPorSubcategoriaMes.get(chaveSubcategoria) ?? 0) + Number(t.valor));
    }
  }

  function buscarExecutado(categoriaId: string, subcategoriaId: string | null, mesIndex: number): number {
    const chave = subcategoriaId ? `${subcategoriaId}-${mesIndex}` : `${categoriaId}-${mesIndex}`;
    const mapa = subcategoriaId ? execPorSubcategoriaMes : execPorCategoriaMes;
    return mapa.get(chave) ?? 0;
  }

  function construirCategoria(categoria: { id: string; nome: string; cor: string | null }): CategoriaAnual {
    const valoresPorMes = Array.from({ length: 12 }, (_, i) => buscarLimite(categoria.id, null, i));
    const valoresExecutadosPorMes = Array.from({ length: 12 }, (_, i) => buscarExecutado(categoria.id, null, i));
    const executadoAnterior = [-3, -2, -1].map((i) => buscarExecutado(categoria.id, null, i));
    const orcadoDezAnterior = buscarLimite(categoria.id, null, -1);
    const subcategorias = (subcategoriasTodas ?? [])
      .filter((s) => s.categoria_id === categoria.id)
      .map((s) => ({
        id: s.id,
        nome: s.nome,
        valoresPorMes: Array.from({ length: 12 }, (_, i) => buscarLimite(categoria.id, s.id, i)),
        valoresExecutadosPorMes: Array.from({ length: 12 }, (_, i) => buscarExecutado(categoria.id, s.id, i)),
        executadoAnterior: [-3, -2, -1].map((i) => buscarExecutado(categoria.id, s.id, i)),
        orcadoDezAnterior: buscarLimite(categoria.id, s.id, -1),
      }));
    return {
      id: categoria.id,
      nome: categoria.nome,
      cor: categoria.cor,
      valoresPorMes,
      valoresExecutadosPorMes,
      executadoAnterior,
      orcadoDezAnterior,
      subcategorias,
    };
  }

  const categoriasReceita = (categoriasTodas ?? []).filter((c) => c.tipo === 'receita').map(construirCategoria);
  const categoriasDespesa = (categoriasTodas ?? []).filter((c) => c.tipo === 'despesa').map(construirCategoria);

  return <OrcamentosClient key={ano} ano={ano} categoriasReceita={categoriasReceita} categoriasDespesa={categoriasDespesa} />;
}
