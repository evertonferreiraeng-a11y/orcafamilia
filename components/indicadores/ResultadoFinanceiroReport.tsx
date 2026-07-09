'use client';

import { useState } from 'react';
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

type Modo = 'realizado' | 'orcado' | 'ambos';

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

export function ResultadoFinanceiroReport({
  pontosAno,
  pontosOrcadoAno,
}: {
  pontosAno: PontoMes[];
  pontosOrcadoAno: PontoMes[];
}) {
  const [modo, setModo] = useState<Modo>('realizado');

  const dados = pontosAno.map((p, i) => ({
    label: p.label,
    receita: p.receita,
    despesa: p.despesa,
    resultado: p.resultado,
    percentualLucro: p.percentualLucro,
    receitaOrcada: pontosOrcadoAno[i]?.receita ?? 0,
    despesaOrcada: pontosOrcadoAno[i]?.despesa ?? 0,
    resultadoOrcado: pontosOrcadoAno[i]?.resultado ?? 0,
    percentualLucroOrcado: pontosOrcadoAno[i]?.percentualLucro ?? 0,
  }));

  const resultadoAnualRealizado = pontosAno.reduce((a, p) => a + p.resultado, 0);
  const resultadoAnualOrcado = pontosOrcadoAno.reduce((a, p) => a + p.resultado, 0);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Resultado Financeiro</h2>
          <p className="text-sm text-gray-500">Acompanhe a evolução dos seus Ganhos e Prejuízos a cada mês</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setModo('realizado')}
              className={cn('rounded-md px-3 py-1 font-medium', modo === 'realizado' ? 'bg-gray-900 text-white' : 'text-gray-500')}
            >
              Realizado
            </button>
            <button
              type="button"
              onClick={() => setModo('orcado')}
              className={cn('rounded-md px-3 py-1 font-medium', modo === 'orcado' ? 'bg-gray-900 text-white' : 'text-gray-500')}
            >
              Orçado
            </button>
            <button
              type="button"
              onClick={() => setModo('ambos')}
              className={cn('rounded-md px-3 py-1 font-medium', modo === 'ambos' ? 'bg-gray-900 text-white' : 'text-gray-500')}
            >
              Orçado + Realizado
            </button>
          </div>
          {modo !== 'orcado' && (
            <div className={cn('rounded-xl px-4 py-2.5 text-right', resultadoAnualRealizado >= 0 ? 'bg-positive/10' : 'bg-negative/10')}>
              <p className={cn('text-xs font-medium', resultadoAnualRealizado >= 0 ? 'text-positive' : 'text-negative')}>
                Resultado Anual{modo === 'ambos' ? ' Realizado' : ''}
              </p>
              <p className={cn('text-lg font-bold', resultadoAnualRealizado >= 0 ? 'text-positive' : 'text-negative')}>
                {formatCurrency(resultadoAnualRealizado)}
              </p>
            </div>
          )}
          {modo !== 'realizado' && (
            <div className={cn('rounded-xl px-4 py-2.5 text-right', resultadoAnualOrcado >= 0 ? 'bg-positive/10' : 'bg-negative/10')}>
              <p className={cn('text-xs font-medium', resultadoAnualOrcado >= 0 ? 'text-positive' : 'text-negative')}>
                Resultado Anual Orçado
              </p>
              <p className={cn('text-lg font-bold', resultadoAnualOrcado >= 0 ? 'text-positive' : 'text-negative')}>
                {formatCurrency(resultadoAnualOrcado)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {dados.map((p) => {
          const valor = modo === 'orcado' ? p.resultadoOrcado : p.resultado;
          const percentual = modo === 'orcado' ? p.percentualLucroOrcado : p.percentualLucro;
          return (
            <MesValorCard
              key={p.label}
              mes={p.label}
              valor={valor}
              percentualLabel="% Lucro"
              percentual={percentual}
              tom={valor >= 0 ? 'positivo' : 'negativo'}
              comparacaoLabel={modo === 'ambos' ? 'Orçado' : undefined}
              comparacaoValor={modo === 'ambos' ? p.resultadoOrcado : undefined}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Resultado por mês</h3>
            {modo === 'ambos' && (
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-500" /> Realizado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-gray-400" /> Orçado
                </span>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
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
              <Tooltip formatter={(v: number) => formatCurrency(v)} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              {modo !== 'orcado' && (
                <Bar dataKey="resultado" name="Resultado Realizado" radius={[4, 4, 0, 0]}>
                  {dados.map((p, i) => (
                    <Cell key={i} fill={p.resultado >= 0 ? '#16a34a' : '#dc2626'} />
                  ))}
                </Bar>
              )}
              {modo === 'orcado' && (
                <Bar dataKey="resultadoOrcado" name="Resultado Orçado" radius={[4, 4, 0, 0]}>
                  {dados.map((p, i) => (
                    <Cell key={i} fill={p.resultadoOrcado >= 0 ? '#16a34a' : '#dc2626'} />
                  ))}
                </Bar>
              )}
              {modo === 'ambos' && (
                <Bar dataKey="resultadoOrcado" name="Resultado Orçado" fill="#9ca3af" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Receita x Gastos x Resultado</h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-positive" /> Receita
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-negative" /> Gastos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-500" /> Resultado
              </span>
              {modo === 'ambos' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full border-2 border-positive" /> Receita Orçada
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full border-2 border-negative" /> Gastos Orçados
                  </span>
                </>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
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
              <Tooltip content={<ResultadoTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              {modo !== 'orcado' && (
                <>
                  <Bar dataKey="receita" name="Receita" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesa" name="Gastos" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="resultado" name="Resultado" stroke="rgb(var(--brand-600))" strokeWidth={2} dot={{ r: 3 }} />
                </>
              )}
              {modo === 'orcado' && (
                <>
                  <Bar dataKey="receitaOrcada" name="Receita" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesaOrcada" name="Gastos" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="resultadoOrcado" name="Resultado" stroke="rgb(var(--brand-600))" strokeWidth={2} dot={{ r: 3 }} />
                </>
              )}
              {modo === 'ambos' && (
                <>
                  <Line type="monotone" dataKey="receitaOrcada" name="Receita Orçada" stroke="#16a34a" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="despesaOrcada" name="Gastos Orçados" stroke="#dc2626" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2 }} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
