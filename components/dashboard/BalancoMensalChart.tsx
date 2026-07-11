'use client';

import { useMemo, useState } from 'react';
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

export interface PontoBalanco {
  label: string;
  receita: number;
  despesa: number;
  receitaPago: number;
  despesaPago: number;
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
  const [incluirPendentes, setIncluirPendentes] = useState(false);

  const dadosBase = modo === 'ano' ? mensal : diario;

  const dados = useMemo(
    () =>
      dadosBase.map((d) => {
        const receita = incluirPendentes ? d.receita : d.receitaPago;
        const despesa = incluirPendentes ? d.despesa : d.despesaPago;
        return { label: d.label, receita, despesa, saldo: receita - despesa };
      }),
    [dadosBase, incluirPendentes]
  );

  const totais = useMemo(() => {
    const totalReceita = dados.reduce((a, d) => a + d.receita, 0);
    const totalDespesa = dados.reduce((a, d) => a + d.despesa, 0);
    return { receita: totalReceita, despesa: totalDespesa, saldo: totalReceita - totalDespesa };
  }, [dados]);

  return (
    <div className="flex h-full flex-col">
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

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-positive" /> Receitas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-negative" /> Despesas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> Saldo
          </span>
          <label className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={incluirPendentes}
              onClick={() => setIncluirPendentes((v) => !v)}
              className={cn(
                'relative h-5 w-9 shrink-0 overflow-hidden rounded-full transition-colors',
                incluirPendentes ? 'bg-brand-600' : 'bg-gray-200'
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                  incluirPendentes && 'translate-x-4'
                )}
              />
            </button>
            Incluir pendentes
          </label>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
          <span>
            Total Receitas: <span className="font-semibold text-positive">{formatCurrency(totais.receita)}</span>
          </span>
          <span>
            Total Despesas: <span className="font-semibold text-negative">{formatCurrency(totais.despesa)}</span>
          </span>
          <span>
            Saldo: <span className={cn('font-semibold', totais.saldo >= 0 ? 'text-positive' : 'text-negative')}>{formatCurrency(totais.saldo)}</span>
          </span>
        </div>
      </div>

      <div className="min-h-[280px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
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
              <linearGradient id="corSaldoBalanco" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(var(--brand-500))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="rgb(var(--brand-500))" stopOpacity={0} />
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
                <Bar dataKey="saldo" name="Saldo" fill="rgb(var(--brand-500))" radius={[4, 4, 0, 0]} />
              </>
            )}
            {tipoGrafico === 'linha' && (
              <>
                <Line type="monotone" dataKey="receita" name="Receita" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="despesa" name="Despesa" stroke="#dc2626" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="saldo" name="Saldo" stroke="rgb(var(--brand-500))" strokeWidth={2} dot={false} />
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
                <Area
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo"
                  stroke="rgb(var(--brand-500))"
                  fill="url(#corSaldoBalanco)"
                  strokeWidth={2}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
