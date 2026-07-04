import { cn, formatCurrency } from '@/lib/utils';
import type { SVGProps } from 'react';

export function SummaryCard({
  titulo,
  valor,
  tom = 'neutro',
  subtitulo,
  icon: Icon,
  destaque = false,
}: {
  titulo: string;
  valor: number;
  tom?: 'positivo' | 'negativo' | 'neutro';
  subtitulo?: string;
  icon?: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  destaque?: boolean;
}) {
  return (
    <div className={cn('card p-5', destaque && 'border-brand-600 bg-brand-600')}>
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              destaque ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-600'
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <p className={cn('text-sm font-medium', destaque ? 'text-white/80' : 'text-gray-500')}>{titulo}</p>
          {subtitulo && <p className={cn('text-xs', destaque ? 'text-white/60' : 'text-gray-400')}>{subtitulo}</p>}
        </div>
      </div>
      <p
        className={cn(
          'mt-4 text-xl font-bold',
          destaque
            ? 'text-white'
            : tom === 'positivo'
              ? 'text-positive'
              : tom === 'negativo'
                ? 'text-negative'
                : 'text-gray-900'
        )}
      >
        {formatCurrency(valor)}
      </p>
    </div>
  );
}
