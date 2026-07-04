import { createServerSupabase } from '@/lib/supabase-server';
import { formatCurrency, nomeMes } from '@/lib/utils';
import { projetarSaldo } from '@/lib/forecast';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { EmptyState } from '@/components/ui/EmptyState';

const MESES_PROJECAO = 6;

export default async function PrevisaoPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: contas }, { data: transacoesContas }, { data: recorrentes }] = await Promise.all([
    supabase.from('contas').select('id, saldo_inicial').eq('user_id', user.id).eq('ativa', true),
    supabase
      .from('transacoes')
      .select('conta_id, tipo, valor')
      .eq('user_id', user.id)
      .eq('pago', true)
      .not('conta_id', 'is', null),
    supabase
      .from('transacoes')
      .select('tipo, valor, frequencia')
      .eq('user_id', user.id)
      .eq('recorrente', true)
      .eq('eh_transferencia', false)
      .is('parcela_total', null),
  ]);

  let saldoAtual = (contas ?? []).reduce((acc, c) => acc + Number(c.saldo_inicial), 0);
  for (const t of transacoesContas ?? []) {
    const sinal = t.tipo === 'receita' ? 1 : -1;
    saldoAtual += sinal * Number(t.valor);
  }

  const recorrentesResumo = (recorrentes ?? []).map((r) => ({
    tipo: r.tipo as 'receita' | 'despesa',
    valor: Number(r.valor),
    frequencia: r.frequencia as 'mensal' | 'semanal' | null,
  }));

  const projecao = projetarSaldo(saldoAtual, recorrentesResumo, MESES_PROJECAO);
  const dadosGrafico = [
    { label: 'Hoje', saldo: saldoAtual },
    ...projecao.map((p) => ({ label: nomeMes(p.mes).split(' de')[0], saldo: p.saldo })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard titulo="Saldo atual" valor={saldoAtual} tom={saldoAtual >= 0 ? 'positivo' : 'negativo'} />
        <SummaryCard
          titulo={`Saldo projetado em ${MESES_PROJECAO} meses`}
          valor={projecao[projecao.length - 1]?.saldo ?? saldoAtual}
          tom={(projecao[projecao.length - 1]?.saldo ?? saldoAtual) >= 0 ? 'positivo' : 'negativo'}
          subtitulo="com base nas recorrências cadastradas"
        />
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Projeção de saldo</h2>
        {recorrentesResumo.length === 0 ? (
          <EmptyState mensagem="Cadastre transações recorrentes para ver a previsão de saldo." />
        ) : (
          <ForecastChart dados={dadosGrafico} />
        )}
      </div>

      <div className="card overflow-x-auto p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Detalhamento por mês</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="py-2 font-medium">Mês</th>
              <th className="py-2 text-right font-medium">Saldo projetado</th>
            </tr>
          </thead>
          <tbody>
            {projecao.map((p) => (
              <tr key={p.mes.toISOString()} className="border-b border-gray-50 last:border-0">
                <td className="py-3 capitalize text-gray-800">{nomeMes(p.mes)}</td>
                <td className={`py-3 text-right font-medium ${p.saldo >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatCurrency(p.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
