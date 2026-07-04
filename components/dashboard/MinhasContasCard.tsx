'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AccountCard } from '@/components/ui/AccountCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconChevronDown } from '@/components/icons';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'orcafamilia:contas-visiveis';

export interface ContaResumo {
  id: string;
  nome: string;
  tipo: string;
  saldo: number;
  cor: string | null;
}

export function MinhasContasCard({ contas }: { contas: ContaResumo[] }) {
  const [aberto, setAberto] = useState(true);

  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo !== null) setAberto(salvo === 'true');
  }, []);

  function alternar() {
    setAberto((atual) => {
      const novo = !atual;
      localStorage.setItem(STORAGE_KEY, String(novo));
      return novo;
    });
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={alternar} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          Minhas contas
          <IconChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', !aberto && '-rotate-90')} />
        </button>
        <Link
          href="/cadastro"
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
        >
          <IconPlus className="h-3.5 w-3.5" />
          Adicionar
        </Link>
      </div>

      {aberto &&
        (contas.length === 0 ? (
          <div className="mt-4">
            <EmptyState mensagem="Nenhuma conta cadastrada ainda." />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {contas.map((conta) => (
              <AccountCard key={conta.id} nome={conta.nome} tipo={conta.tipo} saldo={conta.saldo} cor={conta.cor} />
            ))}
          </div>
        ))}
    </div>
  );
}
