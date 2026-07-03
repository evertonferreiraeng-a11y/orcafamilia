import { cn, formatCurrency } from '@/lib/utils';

export function SummaryCard({
  titulo,
  valor,
  tom = 'neutro',
  subtitulo,
}: {
  titulo: string;
  valor: number;
  tom?: 'positivo' | 'negativo' | 'neutro';
  subtitulo?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-gray-500">{titulo}</p>
      <p
        className={cn(
          'mt-2 text-2xl font-bold',
          tom === 'positivo' && 'text-positive',
          tom === 'negativo' && 'text-negative',
          tom === 'neutro' && 'text-gray-900'
        )}
      >
        {formatCurrency(valor)}
      </p>
      {subtitulo && <p className="mt-1 text-xs text-gray-400">{subtitulo}</p>}
    </div>
  );
}
