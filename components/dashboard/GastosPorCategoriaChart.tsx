'use client';

import { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
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
          percentualTotal: soma > 0 ? (valor / soma) * 100 : 0,
          percentualOrcamento: limite ? (valor / limite) * 100 : null,
        };
      })
      .sort((a, b) => b.valor - a.valor);

    return { linhas, total: soma };
  }, [despesas, categorias, orcamentos, incluirPendentes]);

  return (
    <div className="card p-5">
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
          className={cn('relative h-5 w-9 rounded-full transition-colors', incluirPendentes ? 'bg-brand-600' : 'bg-gray-200')}
        >
          <span
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
              incluirPendentes ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
        Incluir pendentes
      </label>

      {linhas.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Nenhuma despesa no período.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={linhas} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {linhas.map((l) => (
                    <Cell key={l.categoriaId} fill={l.cor} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
            {linhas.map((l) => (
              <div key={l.categoriaId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-700">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.cor }} />
                    {l.nome}
                  </span>
                  <span className="text-right">
                    <span className="font-semibold text-gray-900">{formatCurrency(l.valor)}</span>{' '}
                    <span className="text-xs text-gray-400">{l.percentualTotal.toFixed(0)}%</span>
                  </span>
                </div>
                {l.percentualOrcamento !== null ? (
                  <div className="mt-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn('h-full rounded-full', l.percentualOrcamento > 100 ? 'bg-negative' : 'bg-brand-500')}
                        style={{ width: `${Math.min(100, l.percentualOrcamento)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">{l.percentualOrcamento.toFixed(0)}% do orçamento</p>
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs text-gray-400">Sem orçamento definido</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
