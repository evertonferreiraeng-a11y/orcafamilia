'use client';

import { formatCurrency } from '@/lib/utils';
import type { PontoTipoDespesa, ParcelamentoAtivo } from '@/components/indicadores/IndicadoresClient';

const MESES_NOME = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatarDataFim(dataFim: string | null): string {
  if (!dataFim) return '—';
  const [ano, mes] = dataFim.split('-');
  return `${MESES_NOME[Number(mes) - 1]}/${ano}`;
}

export function DespesasTipoReport({
  pontosTipoDespesaAno,
  parcelamentosAtivos,
}: {
  pontosTipoDespesaAno: PontoTipoDespesa[];
  parcelamentosAtivos: ParcelamentoAtivo[];
}) {
  const totalFixa = pontosTipoDespesaAno.reduce((a, p) => a + p.fixa, 0);
  const totalVariavel = pontosTipoDespesaAno.reduce((a, p) => a + p.variavel, 0);
  const totalParcelada = pontosTipoDespesaAno.reduce((a, p) => a + p.parcelada, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4 text-center">
          <p className="text-sm font-medium text-gray-500">Despesas Fixas (ano)</p>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(totalFixa)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-sm font-medium text-gray-500">Despesas Variáveis (ano)</p>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(totalVariavel)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-sm font-medium text-gray-500">Despesas Parceladas (ano)</p>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(totalParcelada)}</p>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Evolução Mensal por Tipo de Despesa</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-2 py-2 font-medium">Mês</th>
                <th className="px-2 py-2 text-right font-medium">Fixa</th>
                <th className="px-2 py-2 text-right font-medium">Variável</th>
                <th className="px-2 py-2 text-right font-medium">Parcelada</th>
                <th className="px-2 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {pontosTipoDespesaAno.map((p) => (
                <tr key={p.label} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-1.5 text-gray-600">{p.label}</td>
                  <td className="px-2 py-1.5 text-right text-gray-500">{formatCurrency(p.fixa)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-500">{formatCurrency(p.variavel)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-500">{formatCurrency(p.parcelada)}</td>
                  <td className="px-2 py-1.5 text-right font-medium text-gray-900">
                    {formatCurrency(p.fixa + p.variavel + p.parcelada)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold text-gray-900">
                <td className="px-2 py-2">Total</td>
                <td className="px-2 py-2 text-right">{formatCurrency(totalFixa)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(totalVariavel)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(totalParcelada)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(totalFixa + totalVariavel + totalParcelada)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Parcelamentos em Andamento</h3>
        {parcelamentosAtivos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum parcelamento em andamento.</p>
        ) : (
          <div className="space-y-2">
            {parcelamentosAtivos.map((p, i) => (
              <div
                key={`${p.descricao}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.descricao}</p>
                  <p className="text-xs text-gray-400">
                    {p.parcelaAtual} de {p.parcelaTotal} parcelas · {formatCurrency(p.valorParcela)}/mês
                  </p>
                </div>
                <p className="text-xs font-medium text-gray-600">Termina em {formatarDataFim(p.dataFim)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
