'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { IconChevronDown, IconCheck, IconRelogio } from '@/components/icons';

export type StatCardDetalhe = { label: string; valor: number; tipo?: 'ok' | 'pendente' };

export function StatCardDetalhes({ detalhes }: { detalhes: StatCardDetalhe[] }) {
  const [aberto, setAberto] = useState(true);

  return (
    <div className="mt-3 border-t border-black/5 pt-3">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        {aberto ? 'Ocultar detalhes' : 'Mostrar detalhes'}
        <IconChevronDown className={cn('h-3.5 w-3.5 transition-transform', aberto && 'rotate-180')} />
      </button>

      {aberto && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {detalhes.map((d) => {
            const DetalheIcon = d.tipo === 'pendente' ? IconRelogio : IconCheck;
            return (
              <div key={d.label} className="flex items-start gap-1.5">
                <DetalheIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <div>
                  <p className="text-[11px] leading-tight text-gray-400">{d.label}</p>
                  <p className="text-sm font-semibold text-gray-700">
                    <ValorMonetario valor={d.valor} />
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
