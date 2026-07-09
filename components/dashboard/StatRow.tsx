import { cn } from '@/lib/utils';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import type { SVGProps } from 'react';

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
  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <p className="text-sm font-medium text-gray-500">{titulo}</p>
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

      <p
        className={cn(
          'mt-3 text-xl font-bold',
          tom === 'positivo' ? 'text-positive' : tom === 'negativo' ? 'text-negative' : 'text-gray-900'
        )}
      >
        <ValorMonetario valor={valor} />
      </p>
      {valorLabel && <p className="text-xs text-gray-400">{valorLabel}</p>}

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
