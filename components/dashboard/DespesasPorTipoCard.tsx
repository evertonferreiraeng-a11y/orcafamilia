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
    fundo: 'bg-indigo-50',
    iconeFundo: 'bg-indigo-100 text-indigo-600',
    texto: 'text-indigo-700',
    textoSecundario: 'text-indigo-700/70',
  },
  variavel: {
    fundo: 'bg-amber-50',
    iconeFundo: 'bg-amber-100 text-amber-600',
    texto: 'text-amber-700',
    textoSecundario: 'text-amber-700/70',
  },
  receita: {
    fundo: 'bg-emerald-50',
    iconeFundo: 'bg-emerald-100 text-emerald-600',
    texto: 'text-emerald-700',
    textoSecundario: 'text-emerald-700/70',
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
    <div className={cn('card flex flex-col overflow-hidden p-0', className)}>
      <div className={cn('flex items-center gap-3 px-4 py-4', classes.fundo)}>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', classes.iconeFundo)}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className={cn('text-sm font-semibold uppercase tracking-wide', classes.texto)}>
            {titulo}
            {percentualDoGeral !== null && (
              <span className={cn('ml-1.5 font-normal normal-case', classes.textoSecundario)}>
                · {formatPercent0(percentualDoGeral)} do total
              </span>
            )}
          </p>
          <p className={cn('text-xl font-bold', classes.texto)}>
            <ValorMonetario valor={totalExecutado} />
          </p>
        </div>
      </div>

      <div className="flex flex-col p-4">
        {ordenadas.length > 0 ? (
          <div className="flex flex-col">
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
          <p className="py-2 text-center text-sm text-gray-400">{mensagemVazio}</p>
        )}
      </div>

      <div className={cn('flex items-center gap-3 border-t border-gray-100 px-4 py-3 text-sm font-semibold', classes.fundo, classes.texto)}>
        <span className="flex-1 uppercase tracking-wide">Total</span>
        <span className="w-24 shrink-0 text-right">
          <ValorMonetario valor={totalExecutado} />
        </span>
        <span className={cn('w-24 shrink-0 text-right text-xs font-medium', classes.textoSecundario)}>
          {totalOrcado > 0 ? <ValorMonetario valor={totalOrcado} /> : '—'}
        </span>
        <span className={cn('w-16 shrink-0 text-center text-xs font-medium', classes.textoSecundario)}>
          {totalOrcado > 0 ? formatPercent0((totalExecutado / totalOrcado) * 100) : '—'}
        </span>
        <span className={cn('w-16 shrink-0 text-center text-xs font-medium', classes.textoSecundario)}>
          {totalGeral > 0 ? formatPercent0((totalExecutado / totalGeral) * 100) : '—'}
        </span>
      </div>
    </div>
  );
}
