'use client';

import { useState } from 'react';
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { IconChevronDown, IconCheck, IconRelogio } from '@/components/icons';

type IconComponent = (props: SVGProps<SVGSVGElement>) => React.ReactElement;

const TOM_CLASSES = {
  positivo: {
    fundo: 'bg-positive/5',
    iconeFundo: 'bg-positive/15 text-positive',
    valor: 'text-positive',
  },
  negativo: {
    fundo: 'bg-negative/5',
    iconeFundo: 'bg-negative/15 text-negative',
    valor: 'text-negative',
  },
  neutro: {
    fundo: 'bg-brand-50',
    iconeFundo: 'bg-brand-100 text-brand-600',
    valor: 'text-gray-900',
  },
} as const;

export type StatCardDetalhe = { label: string; valor: number; tipo?: 'ok' | 'pendente' };

export function StatCard({
  titulo,
  valor,
  subtitulo,
  tom = 'neutro',
  icon: Icon,
  detalhes,
  extra,
  className,
}: {
  titulo: string;
  valor: number;
  subtitulo: string;
  tom?: 'positivo' | 'negativo' | 'neutro';
  icon: IconComponent;
  detalhes?: StatCardDetalhe[];
  extra?: { titulo: string; valor: number; subtitulo: string };
  className?: string;
}) {
  const [aberto, setAberto] = useState(true);
  const classes = TOM_CLASSES[tom];

  return (
    <div className={cn('rounded-2xl p-4 transition-shadow hover:shadow-card', classes.fundo, className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-600">{titulo}</p>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', classes.iconeFundo)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className={cn('mt-2 text-2xl font-bold', classes.valor)}>
        <ValorMonetario valor={valor} />
      </p>
      <p className="mt-0.5 text-xs text-gray-400">{subtitulo}</p>

      {detalhes && detalhes.length > 0 && (
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
      )}

      {extra && (
        <div className="mt-3 border-t border-black/5 pt-3">
          <p className="text-xs font-semibold text-gray-600">{extra.titulo}</p>
          <p className={cn('mt-1 text-lg font-bold', classes.valor)}>
            <ValorMonetario valor={extra.valor} />
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{extra.subtitulo}</p>
        </div>
      )}
    </div>
  );
}
