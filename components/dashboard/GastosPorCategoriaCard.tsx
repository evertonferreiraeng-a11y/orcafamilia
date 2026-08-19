'use client';

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
const MAX_CATEGORIAS_LISTA = 5;

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
  const ordenadas = [...categorias].sort((a, b) => b.gasto - a.gasto).filter((c) => c.gasto > 0);

  const principais = ordenadas.slice(0, MAX_CATEGORIAS_ANEL);
  const restante = ordenadas.slice(MAX_CATEGORIAS_ANEL);
  const gastoRestante = restante.reduce((a, c) => a + c.gasto, 0);

  const segmentos = [
    ...principais.map((c) => ({ cor: c.cor ?? CINZA_OUTROS, valor: c.gasto })),
    ...(gastoRestante > 0 ? [{ cor: CINZA_OUTROS, valor: gastoRestante }] : []),
  ];

  const totalAnel = segmentos.reduce((a, s) => a + s.valor, 0);

  let acumulado = 0;
  const gradiente = segmentos
    .map((s) => {
      const inicio = totalAnel > 0 ? (acumulado / totalAnel) * 360 : 0;
      acumulado += s.valor;
      const fim = totalAnel > 0 ? (acumulado / totalAnel) * 360 : 0;
      return `${s.cor} ${inicio}deg ${fim}deg`;
    })
    .join(', ');

  const totalFixoVariavel = fixoValor + variavelValor;
  const percentualFixo = totalFixoVariavel > 0 ? (fixoValor / totalFixoVariavel) * 100 : 0;
  const percentualVariavel = totalFixoVariavel > 0 ? (variavelValor / totalFixoVariavel) * 100 : 0;

  const listaExibida = ordenadas.slice(0, MAX_CATEGORIAS_LISTA);

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
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div
            className="relative h-40 w-40 shrink-0 rounded-full"
            style={{ background: `conic-gradient(${gradiente})` }}
          >
            <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center">
              <p className="text-[11px] text-gray-400">Variáveis ({formatPercent0(percentualVariavel)})</p>
              <p className="text-sm font-bold text-gray-900">
                <ValorMonetario valor={variavelValor} />
              </p>
              <p className="mt-1 text-[11px] text-gray-400">Fixas ({formatPercent0(percentualFixo)})</p>
              <p className="text-sm font-bold text-gray-900">
                <ValorMonetario valor={fixoValor} />
              </p>
            </div>
          </div>

          <div className="flex w-full flex-1 flex-col gap-3">
            {listaExibida.map((c) => {
              const percentualOrcado = c.orcado > 0 ? Math.min(100, (c.gasto / c.orcado) * 100) : 0;
              const percentualDoTotal = totalGasto > 0 ? (c.gasto / totalGasto) * 100 : 0;
              const acimaDoLimite = c.orcado > 0 && c.gasto > c.orcado;
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
                      {c.orcado > 0 && (
                        <>
                          {' '}
                          | <span className="font-semibold text-gray-700"><ValorMonetario valor={c.orcado} /></span>
                        </>
                      )}
                    </p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${c.orcado > 0 ? percentualOrcado : 100}%`,
                          backgroundColor: acimaDoLimite ? '#ef4444' : cor,
                        }}
                      />
                    </div>
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
        Ver todas as categorias
      </Link>
    </div>
  );
}
