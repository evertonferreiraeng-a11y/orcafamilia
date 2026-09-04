import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { StatCardDetalhes, type StatCardDetalhe } from '@/components/dashboard/StatCardDetalhes';

export type { StatCardDetalhe };

type IconComponent = (props: SVGProps<SVGSVGElement>) => React.ReactElement;

const TOM_CLASSES = {
  positivo: {
    fundo: 'bg-positive/5',
    iconeFundo: 'bg-positive/15 text-positive',
    valor: 'text-positive',
  },
  negativo: {
    fundo: 'bg-negative/5',
    iconeFundo: 'bg-negative/15 text-negative',
    valor: 'text-negative',
  },
  neutro: {
    fundo: 'bg-brand-50',
    iconeFundo: 'bg-brand-100 text-brand-600',
    valor: 'text-gray-900',
  },
} as const;

export function StatCard({
  titulo,
  valor,
  subtitulo,
  tom = 'neutro',
  icon: Icon,
  detalhes,
  extra,
  className,
}: {
  titulo: string;
  valor: number;
  subtitulo: string;
  tom?: 'positivo' | 'negativo' | 'neutro';
  icon: IconComponent;
  detalhes?: StatCardDetalhe[];
  extra?: { titulo: string; valor: number; subtitulo: string };
  className?: string;
}) {
  const classes = TOM_CLASSES[tom];

  return (
    <div className={cn('rounded-2xl p-4 transition-shadow hover:shadow-card', classes.fundo, className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-600">{titulo}</p>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', classes.iconeFundo)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className={cn('mt-2 text-2xl font-bold', classes.valor)}>
        <ValorMonetario valor={valor} />
      </p>
      <p className="mt-0.5 text-xs text-gray-400">{subtitulo}</p>

      {detalhes && detalhes.length > 0 && <StatCardDetalhes detalhes={detalhes} />}

      {extra && (
        <div className="mt-3 border-t border-black/5 pt-3">
          <p className="text-xs font-semibold text-gray-600">{extra.titulo}</p>
          <p className={cn('mt-1 text-lg font-bold', classes.valor)}>
            <ValorMonetario valor={extra.valor} />
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{extra.subtitulo}</p>
        </div>
      )}
    </div>
  );
}
