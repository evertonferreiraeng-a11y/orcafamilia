'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import type { CategoriaEvolucao } from '@/components/indicadores/IndicadoresClient';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function EvolucaoTooltip({ active, payload, label }: TooltipProps<number, string>) {
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

function PainelCategoria({
  titulo,
  categorias,
  corRealizado,
}: {
  titulo: string;
  categorias: CategoriaEvolucao[];
  corRealizado: string;
}) {
  const [selecionadaId, setSelecionadaId] = useState(categorias[0]?.id ?? '');
  const categoria = categorias.find((c) => c.id === selecionadaId) ?? categorias[0];

  const dados = MESES_ABREV.map((label, i) => ({
    label,
    orcado: categoria?.orcadoPorMes[i] ?? 0,
    realizado: categoria?.realizadoPorMes[i] ?? 0,
  }));

  const totalOrcado = dados.reduce((a, d) => a + d.orcado, 0);
  const totalRealizado = dados.reduce((a, d) => a + d.realizado, 0);

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-700">{titulo}</h3>
        {categorias.length > 0 && (
          <select
            value={categoria?.id}
            onChange={(e) => setSelecionadaId(e.target.value)}
            className="input-field w-auto py-1 text-xs"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {!categoria ? (
        <p className="py-10 text-center text-sm text-gray-400">Nenhuma categoria cadastrada.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                width={40}
              />
              <Tooltip content={<EvolucaoTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="realizado" name="Realizado" fill={corRealizado} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="orcado" name="Orçamento" stroke="#111827" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-2 py-2 font-medium">Mês</th>
                  <th className="px-2 py-2 text-right font-medium">Orçamento</th>
                  <th className="px-2 py-2 text-right font-medium">Realizado</th>
                  <th className="px-2 py-2 text-right font-medium">Variação %</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((d) => {
                  const variacao = d.orcado > 0 ? (d.realizado / d.orcado) * 100 : null;
                  return (
                    <tr key={d.label} className="border-b border-gray-50 last:border-0">
                      <td className="px-2 py-1.5 text-gray-600">{d.label}</td>
                      <td className="px-2 py-1.5 text-right text-gray-500">{formatCurrency(d.orcado)}</td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-900">{formatCurrency(d.realizado)}</td>
                      <td
                        className={cn(
                          'px-2 py-1.5 text-right font-medium',
                          variacao === null ? 'text-gray-400' : variacao > 100 ? 'text-negative' : 'text-positive'
                        )}
                      >
                        {variacao === null ? '—' : `${variacao.toFixed(0)}%`}
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-semibold text-gray-900">
                  <td className="px-2 py-2">Total</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(totalOrcado)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(totalRealizado)}</td>
                  <td className="px-2 py-2 text-right">
                    {totalOrcado > 0 ? `${((totalRealizado / totalOrcado) * 100).toFixed(0)}%` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export function EvolucaoContasReport({
  categoriasReceita,
  categoriasDespesa,
}: {
  categoriasReceita: CategoriaEvolucao[];
  categoriasDespesa: CategoriaEvolucao[];
}) {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-base font-semibold text-gray-900">Evolução das Contas</h2>
        <p className="text-sm text-gray-500">Acompanhe a evolução comparando o Orçamento vs. Realizado</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PainelCategoria titulo="Receitas" categorias={categoriasReceita} corRealizado="#16a34a" />
        <PainelCategoria titulo="Gastos" categorias={categoriasDespesa} corRealizado="#dc2626" />
      </div>
    </div>
  );
}
