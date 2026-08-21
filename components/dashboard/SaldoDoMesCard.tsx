import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { IconWallet } from '@/components/icons';
import { cn } from '@/lib/utils';

export function SaldoDoMesCard({
  receita,
  despesaFixa,
  despesaVariavel,
  className,
}: {
  receita: number;
  despesaFixa: number;
  despesaVariavel: number;
  className?: string;
}) {
  const saldo = receita - despesaFixa - despesaVariavel;
  const positivo = saldo >= 0;

  return (
    <div
      className={cn(
        'card flex flex-col flex-wrap items-start justify-between gap-4 p-4 sm:flex-row sm:items-center',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            positivo ? 'bg-brand-50 text-brand-600' : 'bg-red-50 text-red-600'
          )}
        >
          <IconWallet className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-500">Saldo do mês</p>
          <p className={cn('text-xl font-bold', positivo ? 'text-positive' : 'text-negative')}>
            <ValorMonetario valor={saldo} />
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-medium text-emerald-700">
          Receitas +<ValorMonetario valor={receita} />
        </span>
        <span className="text-gray-300">−</span>
        <span className="font-medium text-indigo-700">
          Despesas Fixas <ValorMonetario valor={despesaFixa} />
        </span>
        <span className="text-gray-300">−</span>
        <span className="font-medium text-amber-700">
          Despesas Variáveis <ValorMonetario valor={despesaVariavel} />
        </span>
        <span className="text-gray-300">=</span>
        <span className={cn('font-semibold', positivo ? 'text-positive' : 'text-negative')}>
          <ValorMonetario valor={saldo} />
        </span>
      </div>
    </div>
  );
}
