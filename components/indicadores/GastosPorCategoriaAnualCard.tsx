'use client';

import { useMemo } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import type { CategoriaEvolucao } from '@/components/indicadores/IndicadoresClient';

export function GastosPorCategoriaAnualCard({ categorias }: { categorias: CategoriaEvolucao[] }) {
  const { linhas, total } = useMemo(() => {
    const linhas = categorias
      .map((c) => {
        const valor = c.realizadoPorMes.reduce((a, v) => a + v, 0);
        const limite = c.orcadoPorMes.reduce((a, v) => a + v, 0);
        return { categoriaId: c.id, nome: c.nome, cor: c.cor ?? '#888888', valor, limite };
      })
      .filter((l) => l.valor > 0)
      .sort((a, b) => b.valor - a.valor);

    const soma = linhas.reduce((a, l) => a + l.valor, 0);
    const comPercentual = linhas.map((l) => ({
      ...l,
      percentualTotal: soma > 0 ? (l.valor / soma) * 100 : 0,
      percentualOrcamento: l.limite > 0 ? (l.valor / l.limite) * 100 : null,
    }));

    return { linhas: comPercentual, total: soma };
  }, [categorias]);

  return (
    <div className="card p-4">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Gastos por Categoria</h2>
          <p className="text-xs text-gray-400">Total realizado no ano, por categoria</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-lg font-bold text-brand-600">{formatCurrency(total)}</p>
        </div>
      </div>

      {linhas.length > 0 && (
        <div className="mb-4 mt-3 flex h-6 w-full overflow-hidden rounded-full bg-gray-100">
          {linhas.map((l) => (
            <div
              key={l.categoriaId}
              title={`${l.nome}: ${l.percentualTotal.toFixed(0)}%`}
              className="flex items-center justify-center overflow-hidden"
              style={{ width: `${l.percentualTotal}%`, backgroundColor: l.cor }}
            >
              {l.percentualTotal >= 8 && (
                <span className="whitespace-nowrap text-[10px] font-semibold text-white">
                  {l.percentualTotal.toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {linhas.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Nenhuma despesa realizada no ano.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {linhas.map((l) => {
            const temOrcamento = l.limite > 0;
            const percentual = l.percentualOrcamento ?? 0;
            return (
              <div key={l.categoriaId} className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: l.cor }}
                >
                  {l.nome.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-gray-700">{l.nome}</span>
                    <span className="shrink-0 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">{formatCurrency(l.valor)}</span>
                      <span className="text-gray-400"> de {formatCurrency(l.limite)}</span>
                    </span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        !temOrcamento ? 'bg-gray-300' : percentual > 100 ? 'bg-negative' : 'bg-brand-500'
                      )}
                      style={{ width: `${temOrcamento ? Math.min(100, percentual) : 100}%` }}
                    />
                  </div>
                  <p className={cn('mt-1 text-xs', temOrcamento ? 'text-gray-400' : 'text-amber-600')}>
                    {temOrcamento ? `${percentual.toFixed(0)}% do orçamento atingido` : 'Sem orçamento definido para esta categoria'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
