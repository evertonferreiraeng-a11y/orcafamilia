import { cn, formatCurrency } from '@/lib/utils';

export function AccountCard({
  nome,
  tipo,
  saldo,
  cor,
}: {
  nome: string;
  tipo: string;
  saldo: number;
  cor: string | null;
}) {
  return (
    <div className="card flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <span
          className="h-9 w-9 shrink-0 rounded-full"
          style={{ backgroundColor: cor ?? '#2a78d6' }}
        />
        <div>
          <p className="text-sm font-medium text-gray-800">{nome}</p>
          <p className="text-xs capitalize text-gray-400">{tipo}</p>
        </div>
      </div>
      <p className={cn('text-sm font-semibold', saldo < 0 ? 'text-negative' : 'text-gray-900')}>
        {formatCurrency(saldo)}
      </p>
    </div>
  );
}
