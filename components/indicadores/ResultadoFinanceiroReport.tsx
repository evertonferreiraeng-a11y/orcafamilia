'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import { MesValorCard } from '@/components/indicadores/MesValorCard';
import { cn, formatCurrency } from '@/lib/utils';
import type { PontoMes } from '@/components/indicadores/IndicadoresClient';

function ResultadoTooltip({ active, payload, label }: TooltipProps<number, string>) {
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

export function ResultadoFinanceiroReport({ pontosAno }: { pontosAno: PontoMes[] }) {
  const resultadoAnual = pontosAno.reduce((a, p) => a + p.resultado, 0);
  const positivo = resultadoAnual >= 0;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Resultado Financeiro</h2>
          <p className="text-sm text-gray-500">Acompanhe a evolução dos seus Ganhos e Prejuízos a cada mês</p>
        </div>
        <div className={cn('rounded-xl px-4 py-2.5 text-right', positivo ? 'bg-positive/10' : 'bg-negative/10')}>
          <p className={cn('text-xs font-medium', positivo ? 'text-positive' : 'text-negative')}>Resultado Anual</p>
          <p className={cn('text-lg font-bold', positivo ? 'text-positive' : 'text-negative')}>
            {formatCurrency(resultadoAnual)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {pontosAno.map((p) => (
          <MesValorCard
            key={p.label}
            mes={p.label}
            valor={p.resultado}
            percentualLabel="% Lucro"
            percentual={p.percentualLucro}
            tom={p.resultado >= 0 ? 'positivo' : 'negativo'}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Resultado por mês</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pontosAno} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                width={40}
              />
              <Tooltip formatter={(v: number) => formatCurrency(v)} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="resultado" name="Resultado" radius={[4, 4, 0, 0]}>
                {pontosAno.map((p, i) => (
                  <Cell key={i} fill={p.resultado >= 0 ? '#16a34a' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Receita x Gastos x Resultado</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-positive" /> Receita
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-negative" /> Gastos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-500" /> Resultado
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={pontosAno} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                width={40}
              />
              <Tooltip content={<ResultadoTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="receita" name="Receita" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" name="Gastos" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="resultado" name="Resultado" stroke="rgb(var(--brand-600))" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
