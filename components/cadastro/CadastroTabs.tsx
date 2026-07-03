'use client';

import { useState } from 'react';
import { ContasSection } from '@/components/cadastro/ContasSection';
import { CartoesSection } from '@/components/cadastro/CartoesSection';
import { CategoriasSection } from '@/components/cadastro/CategoriasSection';
import { InvestimentosSection } from '@/components/cadastro/InvestimentosSection';
import type { Conta, Cartao, Categoria, Investimento } from '@/types/database';

type Aba = 'contas' | 'cartoes' | 'categorias' | 'investimentos';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'contas', label: 'Contas' },
  { id: 'cartoes', label: 'Cartões' },
  { id: 'categorias', label: 'Categorias' },
  { id: 'investimentos', label: 'Investimentos' },
];

export function CadastroTabs({
  contas,
  cartoes,
  categorias,
  investimentos,
}: {
  contas: Conta[];
  cartoes: Cartao[];
  categorias: Categoria[];
  investimentos: Investimento[];
}) {
  const [aba, setAba] = useState<Aba>('contas');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={
              aba === a.id
                ? 'rounded-xl bg-brand-50 px-4 py-2 text-sm font-medium text-brand-600'
                : 'rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50'
            }
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'contas' && <ContasSection contas={contas} />}
      {aba === 'cartoes' && <CartoesSection cartoes={cartoes} contas={contas} />}
      {aba === 'categorias' && <CategoriasSection categorias={categorias} />}
      {aba === 'investimentos' && <InvestimentosSection investimentos={investimentos} />}
    </div>
  );
}
