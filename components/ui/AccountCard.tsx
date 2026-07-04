import { cn } from '@/lib/utils';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { IconLandmark, IconPiggyBank, IconTrendUp, IconWallet } from '@/components/icons';

const ICONE_POR_TIPO: Record<string, typeof IconWallet> = {
  corrente: IconLandmark,
  poupanca: IconPiggyBank,
  investimento: IconTrendUp,
  dinheiro: IconWallet,
};

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
  const Icone = ICONE_POR_TIPO[tipo] ?? IconWallet;

  return (
    <div className="card bg-gray-50 p-4">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: cor ?? '#2a78d6' }}
        >
          <Icone className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold text-gray-800">{nome}</p>
      </div>

      <p className={cn('mt-3 text-lg font-bold', saldo < 0 ? 'text-negative' : 'text-gray-900')}>
        <ValorMonetario valor={saldo} />
      </p>
      <p className="mt-0.5 text-xs capitalize text-gray-400">{tipo}</p>

      <span className="mt-3 inline-flex items-center rounded-full bg-positive/10 px-2.5 py-1 text-xs font-medium text-positive">
        Ativa
      </span>
    </div>
  );
}
