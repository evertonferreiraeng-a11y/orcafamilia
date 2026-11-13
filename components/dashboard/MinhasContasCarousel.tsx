import Link from 'next/link';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { ValorAnimado } from '@/components/ui/ValorAnimado';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconLandmark, IconPiggyBank, IconTrendUp, IconWallet } from '@/components/icons';
import { cn } from '@/lib/utils';

const ICONE_POR_TIPO: Record<string, typeof IconWallet> = {
  corrente: IconLandmark,
  poupanca: IconPiggyBank,
  investimento: IconTrendUp,
  dinheiro: IconWallet,
};

const ROTULO_TIPO: Record<string, string> = {
  corrente: 'Corrente',
  poupanca: 'Poupança',
  investimento: 'Investimento',
  dinheiro: 'Dinheiro',
};

export interface ContaResumo {
  id: string;
  nome: string;
  tipo: string;
  saldo: number;
  cor: string | null;
}

export function MinhasContasCarousel({ contas }: { contas: ContaResumo[] }) {
  const total = contas.reduce((a, c) => a + c.saldo, 0);
  const positivo = contas.reduce((a, c) => a + Math.max(0, c.saldo), 0);
  const negativas = contas.filter((c) => c.saldo < 0).length;
  const ordenadas = [...contas].sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));

  return (
    <div className="card flex h-full flex-col p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">🏦</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900">Minhas contas</h2>
          <p className="text-xs text-gray-500">{contas.length} conta(s)</p>
        </div>
        <Link
          href="/cadastro"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
          title="Adicionar conta"
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
        <>
          <div className={cn('mt-3 rounded-2xl px-3.5 py-3', total < 0 ? 'bg-red-50' : 'bg-gray-50')}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Saldo somado</p>
            <p className={cn('text-xl font-bold tabular-nums', total < 0 ? 'text-negative' : 'text-gray-900')}>
              <ValorAnimado valor={total} />
            </p>
            {negativas > 0 && <p className="mt-0.5 text-[11px] font-medium text-red-600">⚠️ {negativas} conta(s) no negativo</p>}
          </div>

          <ul className="mt-3 space-y-2">
            {ordenadas.map((conta, i) => {
              const Icone = ICONE_POR_TIPO[conta.tipo] ?? IconWallet;
              const cor = conta.cor ?? '#2a78d6';
              const fatia = positivo > 0 && conta.saldo > 0 ? (conta.saldo / positivo) * 100 : 0;
              return (
                <li key={conta.id} className="anim-subir" style={{ animationDelay: `${i * 70}ms` }}>
                  <Link
                    href="/transacoes"
                    className="group relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 text-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
                    style={{ background: `linear-gradient(135deg, ${cor}, ${cor}bb)` }}
                    title={`Ver transações · ${conta.nome}`}
                  >
                    <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 transition group-hover:scale-125" aria-hidden />
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <Icone className="h-4 w-4" />
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{conta.nome}</span>
                        <span className="shrink-0 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-medium">{ROTULO_TIPO[conta.tipo] ?? conta.tipo}</span>
                      </span>
                      {fatia > 0 && (
                        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/20">
                          <span className="anim-crescer block h-full rounded-full bg-white/80" style={{ width: `${fatia}%`, animationDelay: `${200 + i * 70}ms` }} />
                        </span>
                      )}
                    </span>
                    <span className={cn('relative shrink-0 text-right text-sm font-bold tabular-nums', conta.saldo < 0 && 'rounded-lg bg-red-600/40 px-1.5 py-0.5')}>
                      {conta.saldo < 0 && <span className="mr-1">⚠️</span>}
                      <ValorMonetario valor={conta.saldo} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
