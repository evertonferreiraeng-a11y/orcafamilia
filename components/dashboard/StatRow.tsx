import { cn } from '@/lib/utils';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import type { SVGProps } from 'react';

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

export function StatRow({
  titulo,
  valor,
  valorLabel,
  tom = 'neutro',
  icon: Icon,
  badge,
  footer,
  className,
}: {
  titulo: string;
  valor: number;
  valorLabel?: string;
  tom?: 'positivo' | 'negativo' | 'neutro';
  icon?: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  badge?: { texto: string; tom: 'positivo' | 'negativo' };
  footer?: React.ReactNode;
  className?: string;
}) {
  const classes = TOM_CLASSES[tom];

  return (
    <div className={cn('rounded-2xl p-4 transition-shadow hover:shadow-card', classes.fundo, className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', classes.iconeFundo)}>
              <Icon className="h-5 w-5" />
            </span>
          )}
          <p className="text-sm font-semibold text-gray-600">{titulo}</p>
        </div>
        {badge && (
          <span
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
              badge.tom === 'positivo' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
            )}
          >
            {badge.texto}
          </span>
        )}
      </div>

      <p className={cn('mt-3 text-2xl font-bold', classes.valor)}>
        <ValorMonetario valor={valor} />
      </p>
      {valorLabel && <p className="text-xs text-gray-400">{valorLabel}</p>}

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
