'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, type TooltipProps } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export interface PontoTendencia {
  label: string;
  orcado: number;
  gasto: number;
}

function TendenciaTooltip({ active, payload, label }: TooltipProps<number, string>) {
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

export function OrcamentoTendenciaChart({ dados }: { dados: PontoTendencia[] }) {
  return (
    <div className="card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Planejado x Gasto por mês</h2>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> Planejado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-negative" /> Gasto
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            width={40}
          />
          <Tooltip content={<TendenciaTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="orcado" name="Planejado" fill="rgb(var(--brand-500))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gasto" name="Gasto" fill="#dc2626" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
