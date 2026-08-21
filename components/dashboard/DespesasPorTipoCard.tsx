import type { SVGProps } from 'react';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { cn, formatPercent0 } from '@/lib/utils';
import { LinhaCategoriaExpansivel } from './LinhaCategoriaExpansivel';

export interface SubcategoriaExecutadoOrcado {
  id: string;
  nome: string;
  executado: number;
  orcado: number;
}

export interface CategoriaExecutadoOrcado {
  id: string;
  nome: string;
  cor: string | null;
  icone: string | null;
  executado: number;
  orcado: number;
  subcategorias?: SubcategoriaExecutadoOrcado[];
}

const TOM_CLASSES = {
  fixa: {
    iconeFundo: 'bg-indigo-50 text-indigo-600',
    totalFundo: 'bg-indigo-50 text-indigo-700',
  },
  variavel: {
    iconeFundo: 'bg-amber-50 text-amber-600',
    totalFundo: 'bg-amber-50 text-amber-700',
  },
  receita: {
    iconeFundo: 'bg-emerald-50 text-emerald-600',
    totalFundo: 'bg-emerald-50 text-emerald-700',
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
  mostrarPercentualTitulo = true,
  mensagemVazio = 'Nenhuma categoria com valores neste mês.',
  className,
}: {
  titulo: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  tom: 'fixa' | 'variavel' | 'receita';
  categorias: CategoriaExecutadoOrcado[];
  totalExecutado: number;
  totalOrcado: number;
  totalGeral: number;
  mostrarPercentualTitulo?: boolean;
  mensagemVazio?: string;
  className?: string;
}) {
  const classes = TOM_CLASSES[tom];
  const ordenadas = [...categorias].sort((a, b) => b.executado - a.executado);
  const percentualDoGeral = mostrarPercentualTitulo && totalGeral > 0 ? (totalExecutado / totalGeral) * 100 : null;

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
            {ordenadas.map((c) => (
              <LinhaCategoriaExpansivel key={c.id} categoria={c} totalGeral={totalGeral} />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-gray-400">{mensagemVazio}</p>
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
