'use client';

import { useState } from 'react';
import { ContasSection } from '@/components/cadastro/ContasSection';
import { CartoesSection } from '@/components/cadastro/CartoesSection';
import { CategoriasSection } from '@/components/cadastro/CategoriasSection';
import { InvestimentosSection } from '@/components/cadastro/InvestimentosSection';
import { IconCadastro } from '@/components/icons';
import type { Conta, Cartao, Categoria, Subcategoria, Investimento } from '@/types/database';

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
  subcategorias,
  investimentos,
}: {
  contas: Conta[];
  cartoes: Cartao[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  investimentos: Investimento[];
}) {
  const [aba, setAba] = useState<Aba>('contas');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <IconCadastro className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro</h1>
          <p className="mt-1 text-sm text-gray-500">Gerencie contas, cartões, categorias e investimentos</p>
        </div>
      </div>

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
      {aba === 'categorias' && <CategoriasSection categorias={categorias} subcategorias={subcategorias} />}
      {aba === 'investimentos' && <InvestimentosSection investimentos={investimentos} />}
    </div>
  );
}
