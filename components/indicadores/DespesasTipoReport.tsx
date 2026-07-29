'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, type TooltipProps } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { PontoTipoDespesa, ParcelamentoAtivo } from '@/components/indicadores/IndicadoresClient';

const MESES_NOME = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function TipoDespesaTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-gray-900 px-3 py-2.5 text-xs text-white shadow-elevated">
      <p className="mb-1.5 font-medium text-gray-300">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <p key={item.dataKey as string} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-gray-300">{item.name}:</span>
            <span className="font-semibold">{formatCurrency(Number(item.value ?? 0))}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

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
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pontosTipoDespesaAno}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} width={80} />
              <Tooltip content={<TipoDespesaTooltip />} />
              <Bar dataKey="fixa" name="Fixa" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="variavel" name="Variável" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="parcelada" name="Parcelada" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
