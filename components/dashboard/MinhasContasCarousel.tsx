'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconChevronLeft, IconChevronRight, IconLandmark, IconPiggyBank, IconTrendUp, IconWallet } from '@/components/icons';
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
  const [indice, setIndice] = useState(0);

  if (contas.length === 0) {
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
        <div className="mt-4 flex-1">
          <EmptyState mensagem="Nenhuma conta cadastrada ainda." />
        </div>
      </div>
    );
  }

  const conta = contas[indice % contas.length];
  const Icone = ICONE_POR_TIPO[conta.tipo] ?? IconWallet;
  const cor = conta.cor ?? '#2a78d6';

  function anterior() {
    setIndice((i) => (i - 1 + contas.length) % contas.length);
  }

  function proximo() {
    setIndice((i) => (i + 1) % contas.length);
  }

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

      <div className="mt-4 flex flex-1 items-center gap-2">
        <button
          type="button"
          onClick={anterior}
          disabled={contas.length < 2}
          aria-label="Conta anterior"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-0"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>

        <div
          className="relative flex min-h-[160px] flex-1 flex-col justify-between overflow-hidden rounded-md p-4 text-white shadow-elevated"
          style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
            aria-hidden
          />
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Icone className="h-4.5 w-4.5" />
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium capitalize">{conta.tipo}</span>
          </div>
          <div className="relative">
            <p className="text-sm font-medium text-white/80">{conta.nome}</p>
            <p className={cn('mt-1 text-2xl font-bold', conta.saldo < 0 && 'text-red-100')}>
              <ValorMonetario valor={conta.saldo} />
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={proximo}
          disabled={contas.length < 2}
          aria-label="Próxima conta"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-0"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
      </div>

      {contas.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {contas.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setIndice(i)}
              aria-label={`Ver conta ${c.nome}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === indice ? 'w-4 bg-brand-600' : 'w-1.5 bg-gray-200 hover:bg-gray-300'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
