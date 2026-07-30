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

function CelulaValor({
  valor,
  valorAnterior,
  iniciadas,
  finalizadas,
}: {
  valor: number;
  valorAnterior: number | null;
  iniciadas: string[];
  finalizadas: string[];
}) {
  const aumentou = valorAnterior !== null && valor > valorAnterior;
  return (
    <td className="px-2 py-1.5 text-right align-top text-gray-500">
      <div className="flex items-center justify-end gap-1">
        <span>{formatCurrency(valor)}</span>
        {aumentou && (
          <span className="text-positive" title="Aumentou em relação ao mês anterior">
            ▲
          </span>
        )}
      </div>
      {(iniciadas.length > 0 || finalizadas.length > 0) && (
        <div className="mt-0.5 space-y-0.5 text-[11px] font-normal leading-tight">
          {iniciadas.map((n) => (
            <p key={`i-${n}`} className="text-positive">+ {n}</p>
          ))}
          {finalizadas.map((n) => (
            <p key={`f-${n}`} className="text-negative">última: {n}</p>
          ))}
        </div>
      )}
    </td>
  );
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
              {pontosTipoDespesaAno.map((p, i) => {
                const anterior = i > 0 ? pontosTipoDespesaAno[i - 1] : null;
                const total = p.fixa + p.variavel + p.parcelada;
                const totalAnterior = anterior ? anterior.fixa + anterior.variavel + anterior.parcelada : null;
                return (
                  <tr key={p.label} className="border-b border-gray-50 last:border-0">
                    <td className="px-2 py-1.5 text-gray-600">{p.label}</td>
                    <CelulaValor
                      valor={p.fixa}
                      valorAnterior={anterior?.fixa ?? null}
                      iniciadas={p.fixaIniciada}
                      finalizadas={p.fixaFinalizada}
                    />
                    <td className="px-2 py-1.5 text-right text-gray-500">{formatCurrency(p.variavel)}</td>
                    <CelulaValor
                      valor={p.parcelada}
                      valorAnterior={anterior?.parcelada ?? null}
                      iniciadas={p.parceladaIniciada}
                      finalizadas={p.parceladaFinalizada}
                    />
                    <td className="px-2 py-1.5 text-right font-medium text-gray-900">
                      <div className="flex items-center justify-end gap-1">
                        {formatCurrency(total)}
                        {totalAnterior !== null && total > totalAnterior && <span className="text-positive">▲</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
            {parcelamentosAtivos.map((p, i) => {
              const ultimaParcela = p.parcelaTotal - p.parcelaAtual === 1;
              return (
                <div
                  key={`${p.descricao}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {p.descricao}
                      {ultimaParcela && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Última parcela
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.parcelaAtual} de {p.parcelaTotal} parcelas · {formatCurrency(p.valorParcela)}/mês
                    </p>
                  </div>
                  <p className="text-xs font-medium text-gray-600">Termina em {formatarDataFim(p.dataFim)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
