import { cn, formatCurrency } from '@/lib/utils';

export function MesValorCard({
  mes,
  valor,
  percentualLabel,
  percentual,
  tom,
}: {
  mes: string;
  valor: number;
  percentualLabel: string;
  percentual: number;
  tom: 'positivo' | 'negativo' | 'neutro';
}) {
  return (
    <div className="card p-4 text-center">
      <p className="text-sm font-medium text-gray-500">{mes}</p>
      <p
        className={cn(
          'mt-2 text-lg font-bold',
          tom === 'positivo' ? 'text-positive' : tom === 'negativo' ? 'text-negative' : 'text-gray-900'
        )}
      >
        {formatCurrency(valor)}
      </p>
      <p className="mt-1.5 text-xs text-gray-400">
        {percentualLabel} <span className="font-medium text-gray-600">{percentual.toFixed(0)}%</span>
      </p>
    </div>
  );
}
