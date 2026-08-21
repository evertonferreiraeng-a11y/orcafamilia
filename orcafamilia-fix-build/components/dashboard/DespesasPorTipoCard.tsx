import type { SVGProps } from 'react';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { cn, formatPercent0 } from '@/lib/utils';

export interface CategoriaExecutadoOrcado {
  id: string;
  nome: string;
  cor: string | null;
  icone: string | null;
  executado: number;
  orcado: number;
}

const CINZA_PADRAO = '#94a3b8';
const TOLERANCIA = 0.01;

const TOM_CLASSES = {
  fixa: {
    iconeFundo: 'bg-indigo-50 text-indigo-600',
    totalFundo: 'bg-indigo-50 text-indigo-700',
  },
  variavel: {
    iconeFundo: 'bg-amber-50 text-amber-600',
    totalFundo: 'bg-amber-50 text-amber-700',
  },
} as const;

export function DespesasPorTipoCard({
  titulo,
  icon: Icon,
  tom,
  categorias,
  totalExecutado,
  totalOrcado,
  totalGeral,
  className,
}: {
  titulo: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  tom: 'fixa' | 'variavel';
  categorias: CategoriaExecutadoOrcado[];
  totalExecutado: number;
  totalOrcado: number;
  totalGeral: number;
  className?: string;
}) {
  const classes = TOM_CLASSES[tom];
  const ordenadas = [...categorias].sort((a, b) => b.executado - a.executado);
  const percentualDoGeral = totalGeral > 0 ? (totalExecutado / totalGeral) * 100 : null;

  return (
    <div className={cn('card flex flex-col p-4', className)}>
      <div className="flex items-center gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', classes.iconeFundo)}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-500">
            {titulo}
            {percentualDoGeral !== null && (
              <span className="ml-1.5 font-normal text-gray-400">· {formatPercent0(percentualDoGeral)} do total</span>
            )}
          </p>
          <p className="text-xl font-bold text-gray-900">
            <ValorMonetario valor={totalExecutado} />
          </p>
        </div>
      </div>

      {ordenadas.length > 0 ? (
        <div className="mt-4 flex flex-col">
          <div className="flex items-center gap-3 px-1 pb-2 text-xs font-medium uppercase text-gray-400">
            <span className="w-8 shrink-0" />
            <span className="flex-1">Categoria</span>
            <span className="w-24 shrink-0 text-right">Executado</span>
            <span className="w-24 shrink-0 text-right">Orçado</span>
            <span className="w-16 shrink-0 whitespace-nowrap text-center">% Orç.</span>
            <span className="w-16 shrink-0 whitespace-nowrap text-center">% Geral</span>
          </div>
          <div className="divide-y divide-gray-50">
            {ordenadas.map((c) => {
              const cor = c.cor ?? CINZA_PADRAO;
              const acimaDoOrcado = c.orcado > 0 && c.executado > c.orcado + TOLERANCIA;
              const percentualOrcado = c.orcado > 0 ? (c.executado / c.orcado) * 100 : null;
              const percentualGeral = totalGeral > 0 ? (c.executado / totalGeral) * 100 : null;
              return (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                    style={{ backgroundColor: `${cor}22` }}
                  >
                    {c.icone ?? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor }} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{c.nome}</span>
                  <span
                    className={cn(
                      'w-24 shrink-0 text-right text-sm font-semibold',
                      acimaDoOrcado ? 'text-negative' : 'text-gray-900'
                    )}
                  >
                    <ValorMonetario valor={c.executado} />
                  </span>
                  <span className="w-24 shrink-0 text-right text-sm text-gray-500">
                    {c.orcado > 0 ? <ValorMonetario valor={c.orcado} /> : '—'}
                  </span>
                  <span
                    className={cn(
                      'w-16 shrink-0 text-center text-xs font-semibold',
                      percentualOrcado === null ? 'text-gray-400' : acimaDoOrcado ? 'text-negative' : 'text-gray-500'
                    )}
                  >
                    {percentualOrcado !== null ? formatPercent0(percentualOrcado) : '—'}
                  </span>
                  <span className="w-16 shrink-0 text-center text-xs font-medium text-gray-400">
                    {percentualGeral !== null ? formatPercent0(percentualGeral) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-gray-400">Nenhuma despesa deste tipo registrada neste mês.</p>
      )}

      <div className={cn('mt-3 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold', classes.totalFundo)}>
        <span className="flex-1">Total</span>
        <span className="w-24 shrink-0 text-right">
          <ValorMonetario valor={totalExecutado} />
        </span>
        <span className="w-24 shrink-0 text-right opacity-70">
          {totalOrcado > 0 ? <ValorMonetario valor={totalOrcado} /> : '—'}
        </span>
        <span className="w-16 shrink-0 text-center text-xs opacity-70">
          {totalOrcado > 0 ? formatPercent0((totalExecutado / totalOrcado) * 100) : '—'}
        </span>
        <span className="w-16 shrink-0 text-center text-xs opacity-70">
          {totalGeral > 0 ? formatPercent0((totalExecutado / totalGeral) * 100) : '—'}
        </span>
      </div>
    </div>
  );
}
