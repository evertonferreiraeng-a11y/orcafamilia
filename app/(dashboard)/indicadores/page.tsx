import { createServerSupabase } from '@/lib/supabase-server';
import { IndicadoresClient, type PontoMes, type CategoriaEvolucao } from '@/components/indicadores/IndicadoresClient';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default async function IndicadoresPage({
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

  const [{ data: transacoesAno }, { data: categoriasTodas }, { data: subcategoriasTodas }, { data: orcamentosAno }] = await Promise.all([
    supabase
      .from('transacoes')
      .select('data, tipo, valor, pago, categoria_id, subcategoria_id')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .gte('data', `${ano}-01-01`)
      .lte('data', `${ano}-12-31`),
    supabase.from('categorias').select('id, nome, tipo, cor').eq('user_id', user.id).order('nome'),
    supabase.from('subcategorias').select('id, nome, categoria_id').eq('user_id', user.id).order('nome'),
    supabase
      .from('orcamentos')
      .select('categoria_id, subcategoria_id, valor_limite, mes_referencia')
      .eq('user_id', user.id)
      .gte('mes_referencia', `${ano}-01-01`)
      .lte('mes_referencia', `${ano}-12-01`),
  ]);

  const subcategoriaIdsPorCategoria = new Map<string, string[]>();
  for (const s of subcategoriasTodas ?? []) {
    const lista = subcategoriaIdsPorCategoria.get(s.categoria_id) ?? [];
    lista.push(s.id);
    subcategoriaIdsPorCategoria.set(s.categoria_id, lista);
  }

  function orcadoCategoriaMes(categoriaId: string, mesRef: string): number {
    const temSub = (subcategoriaIdsPorCategoria.get(categoriaId)?.length ?? 0) > 0;
    if (temSub) {
      return (orcamentosAno ?? [])
        .filter((o) => o.subcategoria_id && o.categoria_id === categoriaId && o.mes_referencia === mesRef)
        .reduce((a, o) => a + Number(o.valor_limite), 0);
    }
    const linha = (orcamentosAno ?? []).find(
      (o) => !o.subcategoria_id && o.categoria_id === categoriaId && o.mes_referencia === mesRef
    );
    return linha ? Number(linha.valor_limite) : 0;
  }

  const pontosAno: PontoMes[] = MESES_ABREV.map((label, i) => {
    const mesNum = i + 1;
    const doMes = (transacoesAno ?? []).filter((t) => t.pago && Number(t.data.split('-')[1]) === mesNum);
    const receita = doMes.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0);
    const despesa = doMes.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0);
    const resultado = receita - despesa;
    return {
      label,
      receita,
      despesa,
      resultado,
      percentualLucro: receita > 0 ? (resultado / receita) * 100 : 0,
      percentualGasto: receita > 0 ? (despesa / receita) * 100 : 0,
    };
  });

  const pontosOrcadoAno: PontoMes[] = MESES_ABREV.map((label, i) => {
    const mesRef = `${ano}-${String(i + 1).padStart(2, '0')}-01`;
    const receita = (categoriasTodas ?? [])
      .filter((c) => c.tipo === 'receita')
      .reduce((a, c) => a + orcadoCategoriaMes(c.id, mesRef), 0);
    const despesa = (categoriasTodas ?? [])
      .filter((c) => c.tipo === 'despesa')
      .reduce((a, c) => a + orcadoCategoriaMes(c.id, mesRef), 0);
    const resultado = receita - despesa;
    return {
      label,
      receita,
      despesa,
      resultado,
      percentualLucro: receita > 0 ? (resultado / receita) * 100 : 0,
      percentualGasto: receita > 0 ? (despesa / receita) * 100 : 0,
    };
  });

  function construirEvolucao(categoria: { id: string; nome: string }): CategoriaEvolucao {
    const realizadoPorMes = MESES_ABREV.map((_, i) => {
      const mesNum = i + 1;
      return (transacoesAno ?? [])
        .filter((t) => t.pago && t.categoria_id === categoria.id && Number(t.data.split('-')[1]) === mesNum)
        .reduce((a, t) => a + Number(t.valor), 0);
    });
    const orcadoPorMes = MESES_ABREV.map((_, i) => {
      const mesRef = `${ano}-${String(i + 1).padStart(2, '0')}-01`;
      return orcadoCategoriaMes(categoria.id, mesRef);
    });
    const subcategorias = (subcategoriasTodas ?? [])
      .filter((s) => s.categoria_id === categoria.id)
      .map((s) => {
        const subRealizadoPorMes = MESES_ABREV.map((_, i) => {
          const mesNum = i + 1;
          return (transacoesAno ?? [])
            .filter((t) => t.pago && t.subcategoria_id === s.id && Number(t.data.split('-')[1]) === mesNum)
            .reduce((a, t) => a + Number(t.valor), 0);
        });
        return { id: s.id, nome: s.nome, realizadoPorMes: subRealizadoPorMes };
      });
    return { id: categoria.id, nome: categoria.nome, realizadoPorMes, orcadoPorMes, subcategorias };
  }

  const categoriasReceitaEvolucao = (categoriasTodas ?? []).filter((c) => c.tipo === 'receita').map(construirEvolucao);
  const categoriasDespesaEvolucao = (categoriasTodas ?? []).filter((c) => c.tipo === 'despesa').map(construirEvolucao);

  return (
    <IndicadoresClient
      ano={ano}
      pontosAno={pontosAno}
      pontosOrcadoAno={pontosOrcadoAno}
      categoriasReceitaEvolucao={categoriasReceitaEvolucao}
      categoriasDespesaEvolucao={categoriasDespesaEvolucao}
    />
  );
}
