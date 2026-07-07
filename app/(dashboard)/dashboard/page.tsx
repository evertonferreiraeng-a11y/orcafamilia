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
  cn,
} from '@/lib/utils';
import { StatRow } from '@/components/dashboard/StatRow';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MinhasContasCarousel } from '@/components/dashboard/MinhasContasCarousel';
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
      .select('tipo, valor, pago')
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
      .gte('data', `${anoAtual}-01-01`)
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
  const realizado = periodo.filter((t) => t.pago);
  const pendente = periodo.filter((t) => !t.pago);

  const receitaMes = realizado.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0);
  const despesaMes = realizado.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0);
  const saldoMes = receitaMes - despesaMes;

  const pendenteReceita = pendente.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0);
  const pendenteDespesa = pendente.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0);

  const mesAnteriorTransacoes = (transacoesMesAnterior ?? []).filter((t) => t.pago);
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

  const balancoAnual: PontoBalanco[] = MESES_ABREV.map((label) => ({ label, receita: 0, despesa: 0 }));
  for (const t of transacoesMultiAno ?? []) {
    const mesT = Number(t.data.split('-')[1]);
    const idx = mesT - 1;
    if (t.tipo === 'receita') balancoAnual[idx].receita += Number(t.valor);
    else balancoAnual[idx].despesa += Number(t.valor);
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="card p-4 lg:col-span-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:divide-x lg:divide-gray-100">
            <div className="lg:col-span-2 lg:pr-4">
              <BalancoMensalChart diario={fluxo} mensal={balancoAnual} />
            </div>

            <div className="flex flex-col divide-y divide-gray-100">
              <StatRow
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
              <StatRow
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
              <StatRow
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
            </div>
          </div>
        </div>

        <MinhasContasCarousel
          contas={(contas ?? []).map((conta) => ({
            id: conta.id,
            nome: conta.nome,
            tipo: conta.tipo,
            saldo: saldoPorConta.get(conta.id) ?? 0,
            cor: conta.cor,
          }))}
        />
      </div>

      <div className="card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <IconMetas className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-500">Planejado</p>
              <p className="text-xl font-bold text-gray-900">
                <ValorMonetario valor={planejado} />
              </p>
            </div>
          </div>
          {planejado > 0 && (
            <span
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
                percentualOrcamento > 100 ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'
              )}
            >
              {percentualOrcamento.toFixed(0)}% usado
            </span>
          )}
        </div>

        {planejado > 0 ? (
          <div className="mt-4 space-y-2">
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
          <Link href="/orcamentos" className="mt-4 inline-block text-xs font-medium text-brand-600 hover:underline">
            Definir orçamento do mês
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AnaliseCategoriaChart
          transacoes={periodo.map((t) => {
            const categoria = t.categorias as unknown as { nome: string; cor: string | null } | null;
            return {
              tipo: t.tipo as 'receita' | 'despesa',
              valor: Number(t.valor),
              categoria: categoria?.nome ?? null,
              cor: categoria?.cor ?? null,
            };
          })}
        />
        <GastosPorCategoriaChart
          despesas={despesasPorCategoriaMes ?? []}
          categorias={categoriasTodas ?? []}
          orcamentos={orcamentosMes ?? []}
        />
        <TransacoesRecentesCard transacoes={atividades} />
      </div>
    </div>
  );
}
