import Link from 'next/link';
import { eachDayOfInterval, format } from 'date-fns';
import { createServerSupabase } from '@/lib/supabase-server';
import { parseMesParam, primeiroDiaMes, ultimoDiaMes } from '@/lib/utils';
import { impactoMensalRecorrentes } from '@/lib/forecast';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { AccountCard } from '@/components/ui/AccountCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { CashFlowChart, type PontoFluxo } from '@/components/charts/CashFlowChart';
import { RecentActivityList, type AtividadeRecente } from '@/components/RecentActivityList';
import { IconTrendUp, IconTrendDown, IconWallet, IconChart, IconPlus } from '@/components/icons';

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

  const [{ data: contas }, { data: transacoesContas }, { data: transacoesPeriodo }, { data: recorrentes }] =
    await Promise.all([
      supabase.from('contas').select('*').eq('user_id', user.id).eq('ativa', true).order('nome'),
      supabase.from('transacoes').select('conta_id, tipo, valor').eq('user_id', user.id).not('conta_id', 'is', null),
      supabase
        .from('transacoes')
        .select('id, descricao, valor, data, tipo, conta_id, categorias(nome, cor)')
        .eq('user_id', user.id)
        .gte('data', inicio)
        .lte('data', fim)
        .order('data', { ascending: false }),
      supabase.from('transacoes').select('tipo, valor, frequencia').eq('user_id', user.id).eq('recorrente', true),
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
  const receitaMes = periodo.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0);
  const despesaMes = periodo.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0);

  const impactoRecorrente = impactoMensalRecorrentes(
    (recorrentes ?? []).map((r) => ({
      tipo: r.tipo as 'receita' | 'despesa',
      valor: Number(r.valor),
      frequencia: r.frequencia as 'mensal' | 'semanal' | null,
    }))
  );
  const previsao = saldoTotalContas + impactoRecorrente;

  const diasDoMes = eachDayOfInterval({
    start: new Date(`${inicio}T00:00:00`),
    end: new Date(`${fim}T00:00:00`),
  });

  const fluxo: PontoFluxo[] = diasDoMes.map((dia) => {
    const chave = format(dia, 'yyyy-MM-dd');
    const doDia = periodo.filter((t) => t.data === chave);
    return {
      label: format(dia, 'dd'),
      receita: doDia.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0),
      despesa: doDia.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0),
    };
  });

  const atividades: AtividadeRecente[] = periodo.slice(0, 8).map((t) => {
    const categoria = t.categorias as unknown as { nome: string; cor: string | null } | null;
    return {
      id: t.id,
      descricao: t.descricao,
      categoria: categoria?.nome ?? 'Sem categoria',
      cor: categoria?.cor ?? null,
      tipo: t.tipo as 'receita' | 'despesa',
      valor: Number(t.valor),
      data: t.data,
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard titulo="Saldo" valor={saldoTotalContas} subtitulo="em todas as contas" icon={IconWallet} destaque />
        <SummaryCard titulo="Receita" valor={receitaMes} tom="positivo" subtitulo="no período" icon={IconTrendUp} />
        <SummaryCard titulo="Despesa" valor={despesaMes} tom="negativo" subtitulo="no período" icon={IconTrendDown} />
        <SummaryCard titulo="Previsão" valor={previsao} tom={previsao >= 0 ? 'positivo' : 'negativo'} subtitulo="saldo + recorrentes" icon={IconChart} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Minhas contas</h2>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            <IconPlus className="h-3.5 w-3.5" />
            Adicionar
          </Link>
        </div>
        {(contas ?? []).length === 0 ? (
          <EmptyState mensagem="Nenhuma conta cadastrada ainda." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(contas ?? []).map((conta) => (
              <AccountCard
                key={conta.id}
                nome={conta.nome}
                tipo={conta.tipo}
                saldo={saldoPorConta.get(conta.id) ?? 0}
                cor={conta.cor}
              />
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Fluxo de caixa do período</h2>
        <CashFlowChart dados={fluxo} />
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Últimas atividades</h2>
        <RecentActivityList atividades={atividades} />
      </div>
    </div>
  );
}
