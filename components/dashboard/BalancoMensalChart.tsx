'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import { ValorMonetario } from '@/components/ui/ValorMonetario';

export interface PontoBalanco {
  label: string;
  receita: number;
  despesa: number;
}

type TipoGrafico = 'area' | 'linha' | 'barra';
type Modo = 'ano' | 'mes';

function BalancoTooltip({ active, payload, label }: TooltipProps<number, string>) {
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

export function BalancoMensalChart({
  diario,
  mensal,
}: {
  diario: PontoBalanco[];
  mensal: PontoBalanco[];
}) {
  const [modo, setModo] = useState<Modo>('ano');
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>('barra');

  const dados = modo === 'ano' ? mensal : diario;

  const totalReceitas = dados.reduce((acc, d) => acc + d.receita, 0);
  const totalDespesas = dados.reduce((acc, d) => acc + d.despesa, 0);
  const totalLiquido = totalReceitas - totalDespesas;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Balanço Mensal</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
            {(['area', 'linha', 'barra'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoGrafico(t)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium capitalize transition-colors',
                  tipoGrafico === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t === 'area' ? 'Área' : t === 'linha' ? 'Linha' : 'Barra'}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
            {(['ano', 'mes'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  modo === m ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {m === 'ano' ? 'Ano' : 'Mês'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-positive" /> Receitas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-negative" /> Despesas
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
        <div>
          <p className="text-xs font-medium text-gray-400">Receitas</p>
          <p className="mt-0.5 text-sm font-bold text-positive">
            <ValorMonetario valor={totalReceitas} />
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400">Despesas</p>
          <p className="mt-0.5 text-sm font-bold text-negative">
            <ValorMonetario valor={totalDespesas} />
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400">Líquido</p>
          <p className={cn('mt-0.5 text-sm font-bold', totalLiquido >= 0 ? 'text-positive' : 'text-negative')}>
            <ValorMonetario valor={totalLiquido} />
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="corReceitaBalanco" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="corDespesaBalanco" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            width={40}
          />
          <Tooltip content={<BalancoTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          {tipoGrafico === 'barra' && (
            <>
              <Bar dataKey="receita" name="Receita" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </>
          )}
          {tipoGrafico === 'linha' && (
            <>
              <Line type="monotone" dataKey="receita" name="Receita" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="despesa" name="Despesa" stroke="#dc2626" strokeWidth={2} dot={false} />
            </>
          )}
          {tipoGrafico === 'area' && (
            <>
              <Area
                type="monotone"
                dataKey="receita"
                name="Receita"
                stroke="#16a34a"
                fill="url(#corReceitaBalanco)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="despesa"
                name="Despesa"
                stroke="#dc2626"
                fill="url(#corDespesaBalanco)"
                strokeWidth={2}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
