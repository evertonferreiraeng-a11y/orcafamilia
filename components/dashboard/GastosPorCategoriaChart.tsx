'use client';

import { useMemo, useState } from 'react';
import { cn, formatCurrency } from '@/lib/utils';

interface CategoriaMeta {
  id: string;
  nome: string;
  cor: string | null;
}

export interface DespesaResumoMes {
  categoria_id: string | null;
  valor: number;
  pago: boolean;
}

export interface OrcamentoResumoMes {
  categoria_id: string;
  valor_limite: number;
}

export function GastosPorCategoriaChart({
  despesas,
  categorias,
  orcamentos,
}: {
  despesas: DespesaResumoMes[];
  categorias: CategoriaMeta[];
  orcamentos: OrcamentoResumoMes[];
}) {
  const [incluirPendentes, setIncluirPendentes] = useState(true);

  const { linhas, total } = useMemo(() => {
    const porCategoria = new Map<string, number>();
    for (const d of despesas) {
      if (!d.categoria_id) continue;
      if (!incluirPendentes && !d.pago) continue;
      porCategoria.set(d.categoria_id, (porCategoria.get(d.categoria_id) ?? 0) + Number(d.valor));
    }

    const orcamentoPorCategoria = new Map(orcamentos.map((o) => [o.categoria_id, Number(o.valor_limite)]));
    const soma = Array.from(porCategoria.values()).reduce((a, b) => a + b, 0);

    const linhas = Array.from(porCategoria.entries())
      .map(([categoriaId, valor]) => {
        const categoria = categorias.find((c) => c.id === categoriaId);
        const limite = orcamentoPorCategoria.get(categoriaId) ?? null;
        return {
          categoriaId,
          nome: categoria?.nome ?? 'Sem categoria',
          cor: categoria?.cor ?? '#888888',
          valor,
          limite,
          percentualTotal: soma > 0 ? (valor / soma) * 100 : 0,
          percentualOrcamento: limite ? (valor / limite) * 100 : null,
        };
      })
      .sort((a, b) => b.valor - a.valor);

    return { linhas, total: soma };
  }, [despesas, categorias, orcamentos, incluirPendentes]);

  return (
    <div className="card p-4">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Gastos por Categoria</h2>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-lg font-bold text-brand-600">{formatCurrency(total)}</p>
        </div>
      </div>

      <label className="mb-4 flex items-center gap-2 text-sm text-gray-600">
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

      {linhas.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Nenhuma despesa no período.</p>
      ) : (
        <div className="max-h-[320px] space-y-4 overflow-y-auto pr-1">
          {linhas.map((l) => {
            const temOrcamento = l.limite !== null;
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
                      <span className="text-gray-400"> de {temOrcamento ? formatCurrency(l.limite!) : formatCurrency(0)}</span>
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
