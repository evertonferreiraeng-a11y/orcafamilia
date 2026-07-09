'use client';

import { useEffect, useRef, useState } from 'react';
import { IconChevronDown, IconClose } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface OpcaoFiltro {
  value: string;
  label: string;
  cor?: string | null;
  icone?: string | null;
}

export function MultiSelectFiltro({
  label,
  placeholder,
  options,
  selected,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: OpcaoFiltro[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  const todosSelecionados = options.length > 0 && selected.length === options.length;

  function alternarTodos() {
    onChange(todosSelecionados ? [] : options.map((o) => o.value));
  }

  function alternar(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function remover(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  return (
    <div ref={ref} className="relative">
      <label className="label-field">{label}</label>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="input-field flex items-center justify-between text-left"
      >
        <span className={cn('truncate', selected.length === 0 && 'text-gray-400')}>
          {selected.length === 0 ? placeholder : `${selected.length} selecionada(s)`}
        </span>
        <IconChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', aberto && 'rotate-180')} />
      </button>

      {aberto && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-elevated">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">Nenhuma opção disponível.</p>
          ) : (
            <>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={todosSelecionados}
                  onChange={alternarTodos}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Todos
              </label>
              {options.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(o.value)}
                    onChange={() => alternar(o.value)}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  {o.icone ? (
                    <span className="shrink-0 text-base leading-none">{o.icone}</span>
                  ) : o.cor ? (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.cor }} />
                  ) : null}
                  <span className="truncate">{o.label}</span>
                </label>
              ))}
            </>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((value) => {
            const opcao = options.find((o) => o.value === value);
            if (!opcao) return null;
            return (
              <span
                key={value}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600"
              >
                {opcao.label}
                <button type="button" onClick={() => remover(value)} aria-label={`Remover ${opcao.label}`}>
                  <IconClose className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
