import Link from 'next/link';
import { eachDayOfInterval, format } from 'date-fns';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  parseMesParam,
  primeiroDiaMes,
  ultimoDiaMes,
  addMeses,
  calcularVariacaoPercentual,
  formatPercent,
} from '@/lib/utils';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MinhasContasCard } from '@/components/dashboard/MinhasContasCard';
import { BalancoMensalChart, type PontoBalanco } from '@/components/dashboard/BalancoMensalChart';
import { AnaliseCategoriaChart } from '@/components/dashboard/AnaliseCategoriaChart';
import { GastosPorCategoriaChart } from '@/components/dashboard/GastosPorCategoriaChart';
import { TransacoesRecentesCard, type TransacaoRecente } from '@/components/dashboard/TransacoesRecentesCard';
import { IconTrendUp, IconTrendDown, IconWallet, IconMetas } from '@/components/icons';

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
  const hoje = format(new Date(), 'yyyy-MM-dd');

  const mesAnterior = addMeses(mesSelecionado, -1);
  const inicioAnterior = primeiroDiaMes(mesAnterior);
  const fimAnterior = ultimoDiaMes(mesAnterior);
  const anoAtual = mesSelecionado.getFullYear();

  const [
    { data: contas },
    { data: transacoesContas },
    { data: transacoesPeriodo },
    { data: transacoesMesAnterior },
    { data: orcamentosMes },
    { data: despesasPorCategoriaMes },
    { data: categoriasTodas },
    { data: transacoesMultiAno },
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
      .select('id, descricao, valor, data, tipo, conta_id, pago, categorias(nome, cor)')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data', { ascending: false }),
    supabase
      .from('transacoes')
      .select('tipo, valor')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .gte('data', inicioAnterior)
      .lte('data', fimAnterior),
    supabase.from('orcamentos').select('valor_limite, categoria_id').eq('user_id', user.id).eq('mes_referencia', inicio),
    supabase
      .from('transacoes')
      .select('categoria_id, valor, pago')
      .eq('user_id', user.id)
      .eq('tipo', 'despesa')
      .eq('eh_transferencia', false)
      .gte('data', inicio)
      .lte('data', fim),
    supabase.from('categorias').select('id, nome, cor, tipo').eq('user_id', user.id),
    supabase
      .from('transacoes')
      .select('data, tipo, valor, categoria_id')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .gte('data', `${anoAtual - 2}-01-01`)
      .lte('data', `${anoAtual}-12-31`),
  ]);

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
  const realizado = periodo.filter((t) => t.data <= hoje);
  const pendente = periodo.filter((t) => t.data > hoje);

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
  const planejado = (orcamentosMes ?? []).reduce((a, o) => a + Number(o.valor_limite), 0);
  const gastoOrcamento = (orcamentosMes ?? []).reduce((a, o) => a + (gastoPorCategoria.get(o.categoria_id) ?? 0), 0);
  const restanteOrcamento = planejado - gastoOrcamento;
  const percentualOrcamento = planejado > 0 ? (gastoOrcamento / planejado) * 100 : 0;
  const categoriasAcima = (orcamentosMes ?? []).filter(
    (o) => (gastoPorCategoria.get(o.categoria_id) ?? 0) > Number(o.valor_limite)
  ).length;

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
    };
  });

  const porAno: Record<number, PontoBalanco[]> = {};
  for (let a = anoAtual - 2; a <= anoAtual; a++) {
    porAno[a] = MESES_ABREV.map((label) => ({ label, receita: 0, despesa: 0 }));
  }
  for (const t of transacoesMultiAno ?? []) {
    const [anoT, mesT] = t.data.split('-').map(Number);
    if (!porAno[anoT]) continue;
    const idx = mesT - 1;
    if (t.tipo === 'receita') porAno[anoT][idx].receita += Number(t.valor);
    else porAno[anoT][idx].despesa += Number(t.valor);
  }

  const atividades: TransacaoRecente[] = periodo.slice(0, 5).map((t) => {
    const categoria = t.categorias as unknown as { nome: string; cor: string | null } | null;
    return {
      id: t.id,
      descricao: t.descricao,
      categoria: categoria?.nome ?? 'Sem categoria',
      cor: categoria?.cor ?? null,
      tipo: t.tipo as 'receita' | 'despesa',
      valor: Number(t.valor),
      data: t.data,
      pago: t.pago,
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          titulo="Saldo (Este mês)"
          valor={saldoMes}
          tom={saldoMes >= 0 ? 'positivo' : 'negativo'}
          icon={IconWallet}
          badge={
            variacaoSaldo === null
              ? undefined
              : { texto: formatPercent(variacaoSaldo), tom: variacaoSaldo >= 0 ? 'positivo' : 'negativo' }
          }
          footer={
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600">
              Saldo acumulado: <ValorMonetario valor={saldoTotalContas} />
            </span>
          }
        />
        <SummaryCard
          titulo="Receitas"
          valor={receitaMes}
          tom="positivo"
          icon={IconTrendUp}
          badge={
            variacaoReceita === null
              ? undefined
              : { texto: formatPercent(variacaoReceita), tom: variacaoReceita >= 0 ? 'positivo' : 'negativo' }
          }
          footer={
            <span className="inline-flex items-center rounded-full bg-positive/10 px-2.5 py-1 text-xs font-medium text-positive">
              Pendente: <ValorMonetario valor={pendenteReceita} />
            </span>
          }
        />
        <SummaryCard
          titulo="Despesas"
          valor={despesaMes}
          tom="negativo"
          icon={IconTrendDown}
          badge={
            variacaoDespesa === null
              ? undefined
              : { texto: formatPercent(variacaoDespesa), tom: variacaoDespesa <= 0 ? 'positivo' : 'negativo' }
          }
          footer={
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              Pendente: <ValorMonetario valor={pendenteDespesa} />
            </span>
          }
        />
        <SummaryCard
          titulo="Planejado"
          valor={planejado}
          icon={IconMetas}
          badge={
            planejado > 0
              ? { texto: `${percentualOrcamento.toFixed(0)}% usado`, tom: percentualOrcamento > 100 ? 'negativo' : 'positivo' }
              : undefined
          }
          footer={
            planejado > 0 ? (
              <div className="space-y-2">
                <ProgressBar percentual={percentualOrcamento} />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    Gasto: <ValorMonetario valor={gastoOrcamento} />
                  </span>
                  <span>
                    Restante: <ValorMonetario valor={restanteOrcamento} />
                  </span>
                </div>
                {categoriasAcima > 0 && (
                  <p className="text-xs font-medium text-negative">
                    {categoriasAcima} {categoriasAcima === 1 ? 'categoria acima' : 'categorias acima'} do orçamento
                  </p>
                )}
              </div>
            ) : (
              <Link href="/orcamentos" className="text-xs font-medium text-brand-600 hover:underline">
                Definir orçamento do mês
              </Link>
            )
          }
        />
      </div>

      <MinhasContasCard
        contas={(contas ?? []).map((conta) => ({
          id: conta.id,
          nome: conta.nome,
          tipo: conta.tipo,
          saldo: saldoPorConta.get(conta.id) ?? 0,
          cor: conta.cor,
        }))}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <BalancoMensalChart diario={fluxo} porAno={porAno} anoInicial={anoAtual} />
        </div>
        <TransacoesRecentesCard transacoes={atividades} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnaliseCategoriaChart
          transacoes={transacoesMultiAno ?? []}
          categorias={categoriasTodas ?? []}
          anoInicial={anoAtual}
        />
        <GastosPorCategoriaChart
          despesas={despesasPorCategoriaMes ?? []}
          categorias={categoriasTodas ?? []}
          orcamentos={orcamentosMes ?? []}
        />
      </div>
    </div>
  );
}
