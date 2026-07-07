'use client';

import { useMemo, useState } from 'react';
import { cn, formatCurrency } from '@/lib/utils';

export interface TransacaoCategoriaResumo {
  tipo: 'receita' | 'despesa';
  valor: number;
  categoria: string | null;
  cor: string | null;
}

export function AnaliseCategoriaChart({ transacoes }: { transacoes: TransacaoCategoriaResumo[] }) {
  const [tipo, setTipo] = useState<'despesa' | 'receita'>('despesa');

  const { linhas, total } = useMemo(() => {
    const porCategoria = new Map<string, { nome: string; cor: string; valor: number }>();
    let soma = 0;

    for (const t of transacoes) {
      if (t.tipo !== tipo || !t.categoria) continue;
      const atual = porCategoria.get(t.categoria) ?? { nome: t.categoria, cor: t.cor ?? '#888888', valor: 0 };
      atual.valor += Number(t.valor);
      porCategoria.set(t.categoria, atual);
      soma += Number(t.valor);
    }

    const linhas = Array.from(porCategoria.values())
      .map((l) => ({ ...l, percentual: soma > 0 ? (l.valor / soma) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor);

    return { linhas, total: soma };
  }, [transacoes, tipo]);

  return (
    <div className="card p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Análise por Categoria</h2>
        <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTipo('despesa')}
            className={cn('rounded-md px-3 py-1 font-medium', tipo === 'despesa' ? 'bg-gray-900 text-white' : 'text-gray-500')}
          >
            Despesas
          </button>
          <button
            type="button"
            onClick={() => setTipo('receita')}
            className={cn('rounded-md px-3 py-1 font-medium', tipo === 'receita' ? 'bg-gray-900 text-white' : 'text-gray-500')}
          >
            Receitas
          </button>
        </div>
      </div>

      <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
      <p className="text-xs text-gray-400">{tipo === 'despesa' ? 'Total gasto no mês' : 'Total recebido no mês'}</p>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Sem dados para o período selecionado.</p>
      ) : (
        <>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
            {linhas.map((l) => (
              <div key={l.nome} style={{ width: `${l.percentual}%`, backgroundColor: l.cor }} />
            ))}
          </div>

          <div className="mt-4 space-y-2.5">
            {linhas.map((l) => (
              <div key={l.nome} className="flex items-center justify-between text-sm">
                <span className="flex min-w-0 items-center gap-2 text-gray-700">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.cor }} />
                  <span className="truncate">{l.nome}</span>
                </span>
                <span className="shrink-0 font-medium text-gray-900">{l.percentual.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
