'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, type TooltipProps } from 'recharts';
import { formatCurrency, formatPercent, calcularVariacaoPercentual, cn } from '@/lib/utils';
import type { PontoPatrimonio } from '@/components/indicadores/IndicadoresClient';

function PatrimonioTooltip({ active, payload, label }: TooltipProps<number, string>) {
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

export function PatrimonioLiquidoReport({ pontosPatrimonioAno }: { pontosPatrimonioAno: PontoPatrimonio[] }) {
  const inicio = pontosPatrimonioAno[0]?.liquido ?? 0;
  const fim = pontosPatrimonioAno[pontosPatrimonioAno.length - 1]?.liquido ?? 0;
  const variacao = calcularVariacaoPercentual(fim, inicio);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4 text-center">
          <p className="text-sm font-medium text-gray-500">Patrimônio no início do ano</p>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(inicio)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-sm font-medium text-gray-500">Patrimônio no fim do ano</p>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(fim)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-sm font-medium text-gray-500">Variação no ano</p>
          <p className={cn('mt-2 text-lg font-bold', fim >= inicio ? 'text-positive' : 'text-negative')}>
            {variacao === null ? '—' : formatPercent(variacao)}
          </p>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Evolução do Patrimônio Líquido</h3>
        <p className="mb-3 text-xs text-gray-400">Saldo das contas menos dívidas em aberto, mês a mês. Investimentos não entram nesta conta.</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pontosPatrimonioAno}>
              <defs>
                <linearGradient id="patrimonioGradiente" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--brand-600))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="rgb(var(--brand-600))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v)}
                width={80}
              />
              <Tooltip content={<PatrimonioTooltip />} />
              <Area
                type="monotone"
                dataKey="liquido"
                name="Patrimônio Líquido"
                stroke="rgb(var(--brand-600))"
                strokeWidth={2}
                fill="url(#patrimonioGradiente)"
                dot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Detalhe Mensal</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-2 py-2 font-medium">Mês</th>
                <th className="px-2 py-2 text-right font-medium">Contas</th>
                <th className="px-2 py-2 text-right font-medium">Dívidas</th>
                <th className="px-2 py-2 text-right font-medium">Patrimônio Líquido</th>
              </tr>
            </thead>
            <tbody>
              {pontosPatrimonioAno.map((p) => (
                <tr key={p.label} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-1.5 text-gray-600">{p.label}</td>
                  <td className="px-2 py-1.5 text-right text-gray-500">{formatCurrency(p.contas)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-500">{formatCurrency(p.dividas)}</td>
                  <td className="px-2 py-1.5 text-right font-medium text-gray-900">{formatCurrency(p.liquido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
