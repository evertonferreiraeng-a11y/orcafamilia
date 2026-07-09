'use client';

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { MesDonutCard } from '@/components/indicadores/MesDonutCard';
import { cn } from '@/lib/utils';
import type { PontoMes } from '@/components/indicadores/IndicadoresClient';

function corLucro(percentual: number): string {
  if (percentual < 0) return '#dc2626';
  if (percentual < 15) return '#f59e0b';
  return '#16a34a';
}

export function LucroLiquidoReport({ pontosAno }: { pontosAno: PontoMes[] }) {
  const receitaAnual = pontosAno.reduce((a, p) => a + p.receita, 0);
  const resultadoAnual = pontosAno.reduce((a, p) => a + p.resultado, 0);
  const lucroAno = receitaAnual > 0 ? (resultadoAnual / receitaAnual) * 100 : 0;
  const positivo = lucroAno >= 0;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Lucro Líquido Mensal</h2>
          <p className="text-sm text-gray-500">Acompanhe a evolução das sobras de dinheiro no mês</p>
        </div>
        <div className={cn('rounded-xl px-4 py-2.5 text-right', positivo ? 'bg-positive/10' : 'bg-negative/10')}>
          <p className={cn('text-xs font-medium', positivo ? 'text-positive' : 'text-negative')}>Lucro Ano</p>
          <p className={cn('text-lg font-bold', positivo ? 'text-positive' : 'text-negative')}>{lucroAno.toFixed(0)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {pontosAno.map((p) => (
          <MesDonutCard key={p.label} mes={p.label} percentual={p.percentualLucro} cor={corLucro(p.percentualLucro)} label="Lucro" />
        ))}
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">% Lucro por mês</h3>
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
            <Bar dataKey="percentualLucro" name="% Lucro" radius={[4, 4, 0, 0]}>
              {pontosAno.map((p, i) => (
                <Cell key={i} fill={corLucro(p.percentualLucro)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
