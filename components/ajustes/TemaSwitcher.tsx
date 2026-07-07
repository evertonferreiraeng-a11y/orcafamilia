'use client';

import { useEffect, useState } from 'react';
import { TEMAS, TEMA_STORAGE_KEY } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function TemaSwitcher() {
  const [temaAtual, setTemaAtual] = useState('azul');

  useEffect(() => {
    const salvo = localStorage.getItem(TEMA_STORAGE_KEY);
    if (salvo) setTemaAtual(salvo);
  }, []);

  function escolher(chave: string) {
    setTemaAtual(chave);
    localStorage.setItem(TEMA_STORAGE_KEY, chave);
    document.documentElement.setAttribute('data-theme', chave);
  }

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">Aparência</h2>
        <p className="mt-1 text-xs text-gray-400">Escolha a cor de destaque da barra lateral e dos botões.</p>
      </div>
      <div className="flex flex-wrap gap-4">
        {TEMAS.map((tema) => (
          <button
            key={tema.chave}
            type="button"
            onClick={() => escolher(tema.chave)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-colors',
              temaAtual === tema.chave ? 'border-gray-300' : 'border-transparent hover:border-gray-100'
            )}
            aria-label={`Tema ${tema.nome}`}
            aria-pressed={temaAtual === tema.chave}
          >
            <span className="h-8 w-8 rounded-full" style={{ backgroundColor: tema.cor }} />
            <span className="text-xs text-gray-500">{tema.nome}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
