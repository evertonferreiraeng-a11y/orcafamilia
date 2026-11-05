'use client';

import { useEstoque } from '@/components/estoque/EstoqueContext';
import { IconMenos, IconPlus } from '@/components/icons';

export function CabecalhoEstoque({ titulo, descricao, children }: { titulo: string; descricao?: string; children?: React.ReactNode }) {
  const { abrir } = useEstoque();
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Gestão de Estoque Familiar</p>
        <h2 className="text-xl font-bold text-gray-900">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-sm text-gray-500">{descricao}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
        <button type="button" className="btn-primary" onClick={() => abrir({ tipo: 'entrada' })}>
          <IconPlus className="h-4 w-4" /> Entrada
        </button>
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'saida' })}>
          <IconMenos className="h-4 w-4" /> Saída
        </button>
      </div>
    </div>
  );
}
