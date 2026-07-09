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
    <div className="card p-4">
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
        <div className="mt-4">
          <EmptyState mensagem="Nenhuma conta cadastrada ainda." />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 items-start gap-2">
          {contas.map((conta) => {
            const Icone = ICONE_POR_TIPO[conta.tipo] ?? IconWallet;
            const cor = conta.cor ?? '#2a78d6';
            return (
              <div
                key={conta.id}
                className="relative overflow-hidden rounded-md p-2.5 text-white shadow-elevated"
                style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
              >
                <div className="pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full bg-white/10" aria-hidden />
                <div className="flex items-center justify-between gap-1">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <Icone className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-medium capitalize">
                    {conta.tipo}
                  </span>
                </div>
                <div className="relative mt-2">
                  <p className="truncate text-[11px] font-medium text-white/80">{conta.nome}</p>
                  <p className={cn('mt-0.5 truncate text-sm font-bold', conta.saldo < 0 && 'text-red-100')}>
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
