'use client';

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { MesDonutCard } from '@/components/indicadores/MesDonutCard';
import { cn } from '@/lib/utils';
import type { PontoMes } from '@/components/indicadores/IndicadoresClient';

function corGasto(percentual: number): string {
  if (percentual >= 80) return '#dc2626';
  if (percentual >= 50) return '#f59e0b';
  return '#16a34a';
}

export function GastosReport({ pontosAno }: { pontosAno: PontoMes[] }) {
  const receitaAnual = pontosAno.reduce((a, p) => a + p.receita, 0);
  const despesaAnual = pontosAno.reduce((a, p) => a + p.despesa, 0);
  const gastoAno = receitaAnual > 0 ? (despesaAnual / receitaAnual) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Gastos</h2>
          <p className="text-sm text-gray-500">Acompanhe o percentual de Gasto em relação a Receita</p>
        </div>
        <div className={cn('rounded-xl px-4 py-2.5 text-right', gastoAno >= 80 ? 'bg-negative/10' : 'bg-amber-50')}>
          <p className={cn('text-xs font-medium', gastoAno >= 80 ? 'text-negative' : 'text-amber-700')}>
            % Gastos vs. Receita
          </p>
          <p className={cn('text-lg font-bold', gastoAno >= 80 ? 'text-negative' : 'text-amber-700')}>
            {gastoAno.toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {pontosAno.map((p) => (
          <MesDonutCard key={p.label} mes={p.label} percentual={p.percentualGasto} cor={corGasto(p.percentualGasto)} label="Despesas" />
        ))}
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">% Gastos por mês</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={pontosAno} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              width={40}
            />
            <Tooltip formatter={(v: number) => `${v.toFixed(0)}%`} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="percentualGasto" name="% Gastos" radius={[4, 4, 0, 0]}>
              {pontosAno.map((p, i) => (
                <Cell key={i} fill={corGasto(p.percentualGasto)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
