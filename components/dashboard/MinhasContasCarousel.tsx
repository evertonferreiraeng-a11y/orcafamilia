import Link from 'next/link';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconLandmark, IconPiggyBank, IconTrendUp, IconWallet } from '@/components/icons';
import { cn } from '@/lib/utils';

const ICONE_POR_TIPO: Record<string, typeof IconWallet> = {
  corrente: IconLandmark,
  poupanca: IconPiggyBank,
  investimento: IconTrendUp,
  dinheiro: IconWallet,
};

export interface ContaResumo {
  id: string;
  nome: string;
  tipo: string;
  saldo: number;
  cor: string | null;
}

export function MinhasContasCarousel({ contas }: { contas: ContaResumo[] }) {
  return (
    <div className="card flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Minhas contas</h2>
        <Link
          href="/cadastro"
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
        >
          <IconPlus className="h-3.5 w-3.5" />
          Adicionar
        </Link>
      </div>

      {contas.length === 0 ? (
        <div className="mt-4 flex-1">
          <EmptyState mensagem="Nenhuma conta cadastrada ainda." />
        </div>
      ) : (
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {contas.map((conta) => {
            const Icone = ICONE_POR_TIPO[conta.tipo] ?? IconWallet;
            const cor = conta.cor ?? '#2a78d6';
            return (
              <div
                key={conta.id}
                className="relative flex flex-col justify-between overflow-hidden rounded-md p-3 text-white shadow-elevated"
                style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
              >
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10" aria-hidden />
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <Icone className="h-4 w-4" />
                  </span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium capitalize">{conta.tipo}</span>
                </div>
                <div className="relative mt-3">
                  <p className="text-xs font-medium text-white/80">{conta.nome}</p>
                  <p className={cn('mt-0.5 text-lg font-bold', conta.saldo < 0 && 'text-red-100')}>
                    <ValorMonetario valor={conta.saldo} />
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
