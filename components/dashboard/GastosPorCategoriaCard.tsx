'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { IconOrcamentos } from '@/components/icons';
import { cn, formatPercent0 } from '@/lib/utils';

export interface CategoriaGasto {
  id: string;
  nome: string;
  cor: string | null;
  icone: string | null;
  gasto: number;
  orcado: number;
}

const CINZA_OUTROS = '#cbd5e1';
const MAX_CATEGORIAS_ANEL = 7;
const TOLERANCIA = 0.01;
const RAIO_EXTERNO = 100;
const RAIO_INTERNO = 60;
const CENTRO = 100;

function pontoNoCirculo(raio: number, anguloGraus: number) {
  const rad = ((anguloGraus - 90) * Math.PI) / 180;
  return { x: CENTRO + raio * Math.cos(rad), y: CENTRO + raio * Math.sin(rad) };
}

function fatiaDonutPath(anguloInicio: number, anguloFim: number) {
  const largeArc = anguloFim - anguloInicio > 180 ? 1 : 0;
  const inicioExterno = pontoNoCirculo(RAIO_EXTERNO, anguloInicio);
  const fimExterno = pontoNoCirculo(RAIO_EXTERNO, anguloFim);
  const fimInterno = pontoNoCirculo(RAIO_INTERNO, anguloFim);
  const inicioInterno = pontoNoCirculo(RAIO_INTERNO, anguloInicio);
  return [
    `M ${inicioExterno.x} ${inicioExterno.y}`,
    `A ${RAIO_EXTERNO} ${RAIO_EXTERNO} 0 ${largeArc} 1 ${fimExterno.x} ${fimExterno.y}`,
    `L ${fimInterno.x} ${fimInterno.y}`,
    `A ${RAIO_INTERNO} ${RAIO_INTERNO} 0 ${largeArc} 0 ${inicioInterno.x} ${inicioInterno.y}`,
    'Z',
  ].join(' ');
}

export function GastosPorCategoriaCard({
  categorias,
  totalGasto,
  fixoValor,
  variavelValor,
  className,
}: {
  categorias: CategoriaGasto[];
  totalGasto: number;
  fixoValor: number;
  variavelValor: number;
  className?: string;
}) {
  const [segmentoAtivo, setSegmentoAtivo] = useState<{ nome: string; valor: number; percentual: number } | null>(
    null
  );

  const ordenadas = [...categorias].sort((a, b) => b.gasto - a.gasto).filter((c) => c.gasto > 0);

  const principais = ordenadas.slice(0, MAX_CATEGORIAS_ANEL);
  const restante = ordenadas.slice(MAX_CATEGORIAS_ANEL);
  const gastoRestante = restante.reduce((a, c) => a + c.gasto, 0);

  const segmentos = [
    ...principais.map((c) => ({ id: c.id, nome: c.nome, cor: c.cor ?? CINZA_OUTROS, valor: c.gasto })),
    ...(gastoRestante > 0 ? [{ id: '__outros__', nome: 'Outros', cor: CINZA_OUTROS, valor: gastoRestante }] : []),
  ];

  const totalAnel = segmentos.reduce((a, s) => a + s.valor, 0);

  let acumulado = 0;
  const arcos = segmentos.map((s) => {
    const anguloInicio = totalAnel > 0 ? (acumulado / totalAnel) * 360 : 0;
    acumulado += s.valor;
    const anguloFim = totalAnel > 0 ? (acumulado / totalAnel) * 360 : 0;
    return { ...s, anguloInicio, anguloFim, percentual: totalAnel > 0 ? (s.valor / totalAnel) * 100 : 0 };
  });

  const totalFixoVariavel = fixoValor + variavelValor;
  const percentualFixo = totalFixoVariavel > 0 ? (fixoValor / totalFixoVariavel) * 100 : 0;
  const percentualVariavel = totalFixoVariavel > 0 ? (variavelValor / totalFixoVariavel) * 100 : 0;

  return (
    <div className={cn('card flex flex-col p-4', className)}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <IconOrcamentos className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-500">Gastos por Categoria</p>
          <p className="text-xl font-bold text-gray-900">
            <ValorMonetario valor={totalGasto} />
          </p>
        </div>
      </div>

      {totalAnel > 0 ? (
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative h-64 w-64 shrink-0">
            <svg viewBox="0 0 200 200" className="h-full w-full">
              {arcos.map((s) => (
                <path
                  key={s.id}
                  d={fatiaDonutPath(s.anguloInicio, s.anguloFim)}
                  fill={s.cor}
                  stroke="white"
                  strokeWidth={2}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onMouseEnter={() => setSegmentoAtivo({ nome: s.nome, valor: s.valor, percentual: s.percentual })}
                  onMouseLeave={() => setSegmentoAtivo(null)}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-[20%] flex flex-col items-center justify-center rounded-full bg-white text-center">
              {segmentoAtivo ? (
                <>
                  <p className="max-w-[85%] truncate text-xs font-medium text-gray-500">{segmentoAtivo.nome}</p>
                  <p className="text-lg font-bold text-gray-900">
                    <ValorMonetario valor={segmentoAtivo.valor} />
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{formatPercent0(segmentoAtivo.percentual)} do total</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400">Variáveis ({formatPercent0(percentualVariavel)})</p>
                  <p className="text-lg font-bold text-gray-900">
                    <ValorMonetario valor={variavelValor} />
                  </p>
                  <p className="mt-1.5 text-xs text-gray-400">Fixas ({formatPercent0(percentualFixo)})</p>
                  <p className="text-lg font-bold text-gray-900">
                    <ValorMonetario valor={fixoValor} />
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex w-full flex-1 flex-col gap-3">
            {ordenadas.map((c) => {
              const percentualOrcado = c.orcado > 0 ? Math.min(100, (c.gasto / c.orcado) * 100) : 0;
              const percentualDoTotal = totalGasto > 0 ? (c.gasto / totalGasto) * 100 : 0;
              const acimaDoLimite = c.orcado > 0 && c.gasto > c.orcado + TOLERANCIA;
              const cor = c.cor ?? CINZA_OUTROS;
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                    style={{ backgroundColor: `${cor}22` }}
                  >
                    {c.icone ?? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor }} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">{c.nome}</p>
                      <span
                        className={cn(
                          'shrink-0 text-xs font-semibold',
                          acimaDoLimite ? 'text-negative' : 'text-gray-400'
                        )}
                      >
                        {formatPercent0(percentualDoTotal)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      <ValorMonetario valor={c.gasto} />
                      {c.orcado > 0 ? (
                        <>
                          {' '}
                          | <span className="font-semibold text-gray-700"><ValorMonetario valor={c.orcado} /></span>
                        </>
                      ) : (
                        <span className="italic"> · sem orçamento definido</span>
                      )}
                    </p>
                    {c.orcado > 0 && (
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percentualOrcado}%`,
                            backgroundColor: acimaDoLimite ? '#ef4444' : cor,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-gray-400">Nenhum gasto registrado neste mês.</p>
      )}

      <Link href="/orcamentos" className="mt-4 block text-center text-xs font-medium text-brand-600 hover:underline">
        Gerenciar orçamentos
      </Link>
    </div>
  );
}
