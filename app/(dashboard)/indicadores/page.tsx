import { createServerSupabase } from '@/lib/supabase-server';
import { indexarSubcategoriasPorCategoria, orcadoEfetivoCategoria } from '@/lib/orcamentos';
import { agruparParcelamentosAtivos } from '@/lib/parcelamentos';
import {
  IndicadoresClient,
  type PontoMes,
  type CategoriaEvolucao,
  type PontoTipoDespesa,
  type PontoPatrimonio,
} from '@/components/indicadores/IndicadoresClient';

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

  const [
    { data: transacoesAno },
    { data: categoriasTodas },
    { data: subcategoriasTodas },
    { data: orcamentosAno },
    { data: parceladasTodas },
    { data: contasTodas },
    { data: transacoesContasTodas },
    { data: dividasTodas },
    { data: pagamentosDividasTodos },
  ] = await Promise.all([
    supabase
      .from('transacoes')
      .select('data, tipo, valor, pago, categoria_id, subcategoria_id, tipo_despesa, descricao, parcela_atual, parcela_total')
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
    supabase
      .from('transacoes')
      .select('descricao, valor, data_vencimento, parcela_atual, parcela_total, grupo_parcelamento, pago')
      .eq('user_id', user.id)
      .eq('tipo_despesa', 'parcelada')
      .not('grupo_parcelamento', 'is', null),
    supabase.from('contas').select('id, saldo_inicial, criado_em').eq('user_id', user.id),
    supabase
      .from('transacoes')
      .select('conta_id, tipo, valor, data')
      .eq('user_id', user.id)
      .eq('pago', true)
      .not('conta_id', 'is', null),
    supabase.from('dividas').select('id, valor_total, criado_em').eq('user_id', user.id),
    supabase.from('pagamentos_dividas').select('divida_id, valor, data_pagamento').eq('user_id', user.id),
  ]);

  const subcategoriaIdsPorCategoria = indexarSubcategoriasPorCategoria(subcategoriasTodas ?? []);

  function orcadoCategoriaMes(categoriaId: string, mesRef: string): number {
    return orcadoEfetivoCategoria(orcamentosAno ?? [], subcategoriaIdsPorCategoria, categoriaId, mesRef);
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

  function construirEvolucao(categoria: { id: string; nome: string; cor: string | null }): CategoriaEvolucao {
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
    return { id: categoria.id, nome: categoria.nome, cor: categoria.cor, realizadoPorMes, orcadoPorMes, subcategorias };
  }

  const categoriasReceitaEvolucao = (categoriasTodas ?? []).filter((c) => c.tipo === 'receita').map(construirEvolucao);
  const categoriasDespesaEvolucao = (categoriasTodas ?? []).filter((c) => c.tipo === 'despesa').map(construirEvolucao);

  const pontosTipoDespesaAno: PontoTipoDespesa[] = MESES_ABREV.map((label, i) => {
    const mesNum = i + 1;
    const doMes = (transacoesAno ?? []).filter(
      (t) => t.tipo === 'despesa' && Number(t.data.split('-')[1]) === mesNum
    );
    const somaTipo = (tipo: string) => doMes.filter((t) => t.tipo_despesa === tipo).reduce((a, t) => a + Number(t.valor), 0);
    const nomesIniciados = (tipo: string) =>
      doMes.filter((t) => t.tipo_despesa === tipo && t.parcela_atual === 1).map((t) => t.descricao);
    const nomesFinalizados = (tipo: string) =>
      doMes
        .filter((t) => t.tipo_despesa === tipo && t.parcela_total !== null && t.parcela_atual === t.parcela_total)
        .map((t) => t.descricao);
    return {
      label,
      fixa: somaTipo('fixa'),
      variavel: somaTipo('variavel') + doMes.filter((t) => !t.tipo_despesa).reduce((a, t) => a + Number(t.valor), 0),
      parcelada: somaTipo('parcelada'),
      fixaIniciada: nomesIniciados('fixa'),
      fixaFinalizada: nomesFinalizados('fixa'),
      parceladaIniciada: nomesIniciados('parcelada'),
      parceladaFinalizada: nomesFinalizados('parcelada'),
    };
  });

  const parcelamentosAtivos = agruparParcelamentosAtivos(parceladasTodas ?? []);

  const fimDosMeses = MESES_ABREV.map((_, i) => {
    const mesNum = i + 1;
    const ultimoDia = new Date(ano, mesNum, 0).getDate();
    return `${ano}-${String(mesNum).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  });

  const transacoesContasOrdenadas = [...(transacoesContasTodas ?? [])].sort((a, b) => a.data.localeCompare(b.data));
  const saldoContasPorMes: number[] = [];
  {
    let idx = 0;
    let saldoAcumuladoTransacoes = 0;
    for (const fimMes of fimDosMeses) {
      while (idx < transacoesContasOrdenadas.length && transacoesContasOrdenadas[idx].data <= fimMes) {
        const t = transacoesContasOrdenadas[idx];
        saldoAcumuladoTransacoes += (t.tipo === 'receita' ? 1 : -1) * Number(t.valor);
        idx++;
      }
      const saldoInicialTotal = (contasTodas ?? [])
        .filter((c) => c.criado_em.slice(0, 10) <= fimMes)
        .reduce((a, c) => a + Number(c.saldo_inicial), 0);
      saldoContasPorMes.push(saldoInicialTotal + saldoAcumuladoTransacoes);
    }
  }

  const pagamentosOrdenados = [...(pagamentosDividasTodos ?? [])].sort((a, b) =>
    a.data_pagamento.localeCompare(b.data_pagamento)
  );
  const dividasRestantesPorMes: number[] = [];
  {
    const pagoPorDivida = new Map<string, number>();
    let idx = 0;
    for (const fimMes of fimDosMeses) {
      while (idx < pagamentosOrdenados.length && pagamentosOrdenados[idx].data_pagamento <= fimMes) {
        const p = pagamentosOrdenados[idx];
        pagoPorDivida.set(p.divida_id, (pagoPorDivida.get(p.divida_id) ?? 0) + Number(p.valor));
        idx++;
      }
      const restante = (dividasTodas ?? [])
        .filter((d) => d.criado_em.slice(0, 10) <= fimMes)
        .reduce((a, d) => a + Math.max(0, Number(d.valor_total) - (pagoPorDivida.get(d.id) ?? 0)), 0);
      dividasRestantesPorMes.push(restante);
    }
  }

  const pontosPatrimonioAno: PontoPatrimonio[] = MESES_ABREV.map((label, i) => ({
    label,
    contas: saldoContasPorMes[i],
    dividas: dividasRestantesPorMes[i],
    liquido: saldoContasPorMes[i] - dividasRestantesPorMes[i],
  }));

  return (
    <IndicadoresClient
      ano={ano}
      pontosAno={pontosAno}
      pontosOrcadoAno={pontosOrcadoAno}
      categoriasReceitaEvolucao={categoriasReceitaEvolucao}
      categoriasDespesaEvolucao={categoriasDespesaEvolucao}
      pontosTipoDespesaAno={pontosTipoDespesaAno}
      parcelamentosAtivos={parcelamentosAtivos}
      pontosPatrimonioAno={pontosPatrimonioAno}
    />
  );
}
