import { eachDayOfInterval, format, addDays, differenceInCalendarDays } from 'date-fns';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  parseMesParam,
  primeiroDiaMes,
  ultimoDiaMes,
  addMeses,
  calcularVariacaoPercentual,
  formatPercent,
} from '@/lib/utils';
import { indexarSubcategoriasPorCategoria, orcadoEfetivoCategoria } from '@/lib/orcamentos';
import { gerarInsights, type DadosGerente } from '@/lib/gerente';
import { StatRow } from '@/components/dashboard/StatRow';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { MinhasContasCarousel } from '@/components/dashboard/MinhasContasCarousel';
import { PlanejadoGaugeCard } from '@/components/dashboard/PlanejadoGaugeCard';
import { BalancoMensalChart, type PontoBalanco } from '@/components/dashboard/BalancoMensalChart';
import { GerenteFinanceiroCard } from '@/components/dashboard/GerenteFinanceiroCard';
import { GastosPorCategoriaCard, type CategoriaGasto } from '@/components/dashboard/GastosPorCategoriaCard';
import { IconTrendUp, IconTrendDown, IconWallet } from '@/components/icons';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default async function DashboardPage({
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
  const inicio = primeiroDiaMes(mesSelecionado);
  const fim = ultimoDiaMes(mesSelecionado);

  const mesAnterior = addMeses(mesSelecionado, -1);
  const inicioAnterior = primeiroDiaMes(mesAnterior);
  const fimAnterior = ultimoDiaMes(mesAnterior);
  const anoAtual = mesSelecionado.getFullYear();
  const hojeStr = format(new Date(), 'yyyy-MM-dd');
  const em7DiasStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  const [
    { data: contas },
    { data: transacoesContas },
    { data: transacoesPeriodo },
    { data: transacoesMesAnterior },
    { data: orcamentosMes },
    { data: despesasPorCategoriaMes },
    { data: categoriasTodas },
    { data: subcategoriasTodas },
    { data: transacoesMultiAno },
    { data: dividasProximas },
  ] = await Promise.all([
    supabase.from('contas').select('*').eq('user_id', user.id).eq('ativa', true).order('nome'),
    supabase
      .from('transacoes')
      .select('conta_id, tipo, valor')
      .eq('user_id', user.id)
      .eq('pago', true)
      .not('conta_id', 'is', null),
    supabase
      .from('transacoes')
      .select('valor, data, tipo, pago, tipo_despesa, descricao, parcela_atual, parcela_total')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data', { ascending: false }),
    supabase
      .from('transacoes')
      .select('tipo, valor, tipo_despesa')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .gte('data', inicioAnterior)
      .lte('data', fimAnterior),
    supabase
      .from('orcamentos')
      .select('valor_limite, categoria_id, subcategoria_id, mes_referencia')
      .eq('user_id', user.id)
      .eq('mes_referencia', inicio),
    supabase
      .from('transacoes')
      .select('categoria_id, valor, pago')
      .eq('user_id', user.id)
      .eq('tipo', 'despesa')
      .eq('eh_transferencia', false)
      .gte('data', inicio)
      .lte('data', fim),
    supabase.from('categorias').select('id, nome, cor, icone, tipo').eq('user_id', user.id),
    supabase.from('subcategorias').select('id, categoria_id').eq('user_id', user.id),
    supabase
      .from('transacoes')
      .select('data, tipo, valor, pago, categoria_id')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .gte('data', `${anoAtual}-01-01`)
      .lte('data', `${anoAtual}-12-31`),
    supabase
      .from('dividas')
      .select('descricao, valor_total, valor_pago, parcelas_total, data_vencimento')
      .eq('user_id', user.id)
      .eq('status', 'ativa')
      .gte('data_vencimento', hojeStr)
      .lte('data_vencimento', em7DiasStr),
  ]);

  const subcategoriaIdsPorCategoria = indexarSubcategoriasPorCategoria(subcategoriasTodas ?? []);

  const orcamentosEfetivosMes = (categoriasTodas ?? [])
    .filter((c) => c.tipo === 'despesa')
    .map((c) => ({
      categoria_id: c.id,
      valor_limite: orcadoEfetivoCategoria(orcamentosMes ?? [], subcategoriaIdsPorCategoria, c.id, inicio),
    }))
    .filter((o) => o.valor_limite > 0);

  const saldoPorConta = new Map<string, number>();
  for (const conta of contas ?? []) {
    saldoPorConta.set(conta.id, Number(conta.saldo_inicial));
  }
  for (const t of transacoesContas ?? []) {
    if (!t.conta_id) continue;
    const atual = saldoPorConta.get(t.conta_id) ?? 0;
    const sinal = t.tipo === 'receita' ? 1 : -1;
    saldoPorConta.set(t.conta_id, atual + sinal * Number(t.valor));
  }

  const saldoTotalContas = Array.from(saldoPorConta.values()).reduce((a, b) => a + b, 0);

  const periodo = transacoesPeriodo ?? [];
  const realizado = periodo.filter((t) => t.pago);
  const pendente = periodo.filter((t) => !t.pago);

  const receitaMes = realizado.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0);
  const despesaMes = realizado.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0);
  const saldoMes = receitaMes - despesaMes;

  const pendenteReceita = pendente.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0);
  const pendenteDespesa = pendente.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0);

  const mesAnteriorTransacoes = transacoesMesAnterior ?? [];
  const receitaMesAnterior = mesAnteriorTransacoes.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0);
  const despesaMesAnterior = mesAnteriorTransacoes.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0);
  const saldoMesAnterior = receitaMesAnterior - despesaMesAnterior;

  const variacaoSaldo = calcularVariacaoPercentual(saldoMes, saldoMesAnterior);
  const variacaoReceita = calcularVariacaoPercentual(receitaMes, receitaMesAnterior);
  const variacaoDespesa = calcularVariacaoPercentual(despesaMes, despesaMesAnterior);

  const gastoPorCategoria = new Map<string, number>();
  for (const t of despesasPorCategoriaMes ?? []) {
    if (!t.categoria_id) continue;
    gastoPorCategoria.set(t.categoria_id, (gastoPorCategoria.get(t.categoria_id) ?? 0) + Number(t.valor));
  }
  const planejado = orcamentosEfetivosMes.reduce((a, o) => a + o.valor_limite, 0);
  const gastoOrcamento = despesaMes;
  const restanteOrcamento = planejado - gastoOrcamento;
  const percentualOrcamento = planejado > 0 ? (gastoOrcamento / planejado) * 100 : 0;
  const categoriasAcima = orcamentosEfetivosMes.filter(
    (o) => (gastoPorCategoria.get(o.categoria_id) ?? 0) > o.valor_limite
  ).length;

  const nomePorCategoria = new Map((categoriasTodas ?? []).map((c) => [c.id, c.nome]));
  const categoriasAcimaDetalhe = orcamentosEfetivosMes
    .filter((o) => (gastoPorCategoria.get(o.categoria_id) ?? 0) > o.valor_limite)
    .map((o) => {
      const gasto = gastoPorCategoria.get(o.categoria_id) ?? 0;
      return {
        nome: nomePorCategoria.get(o.categoria_id) ?? 'Categoria',
        percentual: o.valor_limite > 0 ? (gasto / o.valor_limite) * 100 : 0,
      };
    });

  const orcadoPorCategoria = new Map(orcamentosEfetivosMes.map((o) => [o.categoria_id, o.valor_limite]));

  const categoriasGastoDetalhe: CategoriaGasto[] = (categoriasTodas ?? [])
    .filter((c) => c.tipo === 'despesa')
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      cor: c.cor,
      icone: c.icone,
      gasto: gastoPorCategoria.get(c.id) ?? 0,
      orcado: orcadoPorCategoria.get(c.id) ?? 0,
    }))
    .filter((c) => c.gasto > 0)
    .sort((a, b) => b.gasto - a.gasto);

  const totalGastoCategorias = (despesasPorCategoriaMes ?? []).reduce((a, t) => a + Number(t.valor), 0);

  const despesaFixaMes = periodo
    .filter((t) => t.tipo === 'despesa' && t.tipo_despesa === 'fixa')
    .reduce((a, t) => a + Number(t.valor), 0);
  const despesaFixaMesAnterior = mesAnteriorTransacoes
    .filter((t) => t.tipo === 'despesa' && t.tipo_despesa === 'fixa')
    .reduce((a, t) => a + Number(t.valor), 0);
  const despesaParceladaMes = periodo
    .filter((t) => t.tipo === 'despesa' && t.tipo_despesa === 'parcelada')
    .reduce((a, t) => a + Number(t.valor), 0);

  const gastoFixoMes = despesaFixaMes + despesaParceladaMes;
  const gastoVariavelMes = totalGastoCategorias - gastoFixoMes;

  const parcelamentosTerminandoMes = periodo
    .filter(
      (t) => t.tipo === 'despesa' && t.tipo_despesa === 'parcelada' && t.parcela_total !== null && t.parcela_atual === t.parcela_total
    )
    .map((t) => ({ descricao: t.descricao, valorParcela: Number(t.valor) }));

  const dividasVencendo = (dividasProximas ?? []).map((d) => {
    const restante = Number(d.valor_total) - Number(d.valor_pago);
    const valorParcela = d.parcelas_total ? Number(d.valor_total) / d.parcelas_total : restante;
    return {
      descricao: d.descricao,
      valorParcela: Math.min(valorParcela, restante),
      diasRestantes: differenceInCalendarDays(new Date(`${d.data_vencimento}T00:00:00`), new Date(`${hojeStr}T00:00:00`)),
    };
  });

  const dadosGerente: DadosGerente = {
    saldoTotalContas,
    receitaMes,
    despesaMes,
    despesaFixaMes,
    despesaFixaMesAnterior,
    despesaParceladaMes,
    categoriasAcima: categoriasAcimaDetalhe,
    dividasVencendo,
    parcelamentosTerminandoMes,
  };
  const insights = gerarInsights(dadosGerente);

  const diasDoMes = eachDayOfInterval({
    start: new Date(`${inicio}T00:00:00`),
    end: new Date(`${fim}T00:00:00`),
  });

  const fluxo: PontoBalanco[] = diasDoMes.map((dia) => {
    const chave = format(dia, 'yyyy-MM-dd');
    const doDia = periodo.filter((t) => t.data === chave);
    return {
      label: format(dia, 'dd'),
      receita: doDia.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0),
      despesa: doDia.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0),
      receitaPago: doDia.filter((t) => t.tipo === 'receita' && t.pago).reduce((a, t) => a + Number(t.valor), 0),
      despesaPago: doDia.filter((t) => t.tipo === 'despesa' && t.pago).reduce((a, t) => a + Number(t.valor), 0),
    };
  });

  const balancoAnual: PontoBalanco[] = MESES_ABREV.map((label) => ({
    label,
    receita: 0,
    despesa: 0,
    receitaPago: 0,
    despesaPago: 0,
  }));
  for (const t of transacoesMultiAno ?? []) {
    const mesT = Number(t.data.split('-')[1]);
    const idx = mesT - 1;
    if (t.tipo === 'receita') {
      balancoAnual[idx].receita += Number(t.valor);
      if (t.pago) balancoAnual[idx].receitaPago += Number(t.valor);
    } else {
      balancoAnual[idx].despesa += Number(t.valor);
      if (t.pago) balancoAnual[idx].despesaPago += Number(t.valor);
    }
  }

  return (
    <div className="space-y-4">
      <GerenteFinanceiroCard insights={insights} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:min-h-[calc(100vh-190px)]">
        <div className="card flex flex-col p-4 lg:col-span-3">
          <div className="grid grid-cols-1 divide-y divide-gray-100 border-b border-gray-100 pb-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatRow
              className="py-4 sm:py-0 sm:pr-4"
              titulo="Saldo (Este mês)"
              valor={saldoMes}
              valorLabel="Pago"
              tom={saldoMes >= 0 ? 'positivo' : 'negativo'}
              icon={IconWallet}
              badge={
                variacaoSaldo === null
                  ? undefined
                  : { texto: formatPercent(variacaoSaldo), tom: variacaoSaldo >= 0 ? 'positivo' : 'negativo' }
              }
              footer={
                <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600">
                  Saldo acumulado (todas as contas): <ValorMonetario valor={saldoTotalContas} />
                </span>
              }
            />
            <StatRow
              className="py-4 sm:py-0 sm:px-4"
              titulo="Receitas"
              valor={receitaMes}
              valorLabel="Pago"
              tom="positivo"
              icon={IconTrendUp}
              badge={
                variacaoReceita === null
                  ? undefined
                  : { texto: formatPercent(variacaoReceita), tom: variacaoReceita >= 0 ? 'positivo' : 'negativo' }
              }
              footer={
                <div className="space-y-1.5">
                  <span className="inline-flex items-center rounded-full bg-positive/10 px-2.5 py-1 text-xs font-medium text-positive">
                    Pendente: <ValorMonetario valor={pendenteReceita} />
                  </span>
                  <p className="text-xs text-gray-400">
                    Total lançado: <ValorMonetario valor={receitaMes + pendenteReceita} />
                  </p>
                </div>
              }
            />
            <StatRow
              className="py-4 sm:py-0 sm:pl-4"
              titulo="Despesas"
              valor={despesaMes}
              valorLabel="Pago"
              tom="negativo"
              icon={IconTrendDown}
              badge={
                variacaoDespesa === null
                  ? undefined
                  : { texto: formatPercent(variacaoDespesa), tom: variacaoDespesa <= 0 ? 'positivo' : 'negativo' }
              }
              footer={
                <div className="space-y-1.5">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Pendente: <ValorMonetario valor={pendenteDespesa} />
                  </span>
                  <p className="text-xs text-gray-400">
                    Total lançado: <ValorMonetario valor={despesaMes + pendenteDespesa} />
                  </p>
                </div>
              }
            />
          </div>

          <div className="mt-4 min-h-0 flex-1">
            <BalancoMensalChart diario={fluxo} mensal={balancoAnual} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <MinhasContasCarousel
            contas={(contas ?? []).map((conta) => ({
              id: conta.id,
              nome: conta.nome,
              tipo: conta.tipo,
              saldo: saldoPorConta.get(conta.id) ?? 0,
              cor: conta.cor,
            }))}
          />
          <PlanejadoGaugeCard
            className="flex-1"
            planejado={planejado}
            gastoOrcamento={gastoOrcamento}
            restanteOrcamento={restanteOrcamento}
            percentualOrcamento={percentualOrcamento}
            categoriasAcima={categoriasAcima}
          />
        </div>
      </div>

      <GastosPorCategoriaCard
        categorias={categoriasGastoDetalhe}
        totalGasto={totalGastoCategorias}
        fixoValor={gastoFixoMes}
        variavelValor={gastoVariavelMes}
      />
    </div>
  );
}
