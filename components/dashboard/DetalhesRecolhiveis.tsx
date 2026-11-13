'use client';

import { useEffect, useState } from 'react';
import { IconChevronDown } from '@/components/icons';
import { cn } from '@/lib/utils';

const CHAVE = 'life-dashboard-detalhes';

/** Seção "Detalhes do mês": recolhida por padrão; lembra se você deixou aberta. */
export function DetalhesRecolhiveis({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    try {
      setAberto(localStorage.getItem(CHAVE) === '1');
    } catch {}
  }, []);
  function alternar() {
    setAberto((v) => {
      try {
        localStorage.setItem(CHAVE, v ? '0' : '1');
      } catch {}
      return !v;
    });
  }

  return (
    <section>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        className="flex w-full items-center gap-2 rounded-2xl bg-white px-4 py-3 text-left shadow-soft ring-1 ring-inset ring-gray-100 transition hover:bg-gray-50"
      >
        <span className="text-base">🔎</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-gray-900">Detalhes do mês</span>
          <span className="block text-xs text-gray-500">Para onde foi o dinheiro, categorias, contas e balanço do ano</span>
        </span>
        <IconChevronDown className={cn('h-5 w-5 text-gray-400 transition-transform', aberto && 'rotate-180')} />
      </button>
      {aberto && <div className="anim-subir mt-4 space-y-4">{children}</div>}
    </section>
  );
}
