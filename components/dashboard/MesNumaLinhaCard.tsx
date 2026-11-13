'use client';

import { useState } from 'react';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { cn } from '@/lib/utils';

export interface ParteMes {
  chave: string;
  rotulo: string;
  emoji: string;
  valor: number;
  cor: string;
  href?: string;
}

/**
 * A receita do mês como uma barra só, dividida em fixas, dívidas, variáveis e sobra.
 * Se os gastos passarem da receita, a barra passa a ter a despesa como base e mostra o que faltou.
 */
export function MesNumaLinhaCard({ receita, aReceber, partes, sobra }: { receita: number; aReceber: number; partes: ParteMes[]; sobra: number }) {
  const [ativa, setAtiva] = useState<string | null>(null);
  const faltou = sobra < 0;
  const segmentos: ParteMes[] = [
    ...partes,
    faltou
      ? { chave: 'faltou', rotulo: 'Faltou', emoji: '⚠️', valor: -sobra, cor: '#ef4444' }
      : { chave: 'sobra', rotulo: 'Sobra', emoji: '🐷', valor: sobra, cor: '#84cc16' },
  ];
  const base = Math.max(1, segmentos.reduce((a, s) => a + s.valor, 0));
  const ref = faltou ? base : Math.max(receita, 1);

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">💸 O mês numa linha</p>
        <p className="text-xs text-gray-500">
          entrou <b className="text-gray-800"><ValorMonetario valor={receita - aReceber} /></b>
          {aReceber > 0 && (
            <>
              {' '}+ a receber <b className="text-gray-800"><ValorMonetario valor={aReceber} /></b>
            </>
          )}
        </p>
      </div>

      <div className="flex h-7 gap-0.5 overflow-hidden rounded-lg bg-gray-100" onMouseLeave={() => setAtiva(null)}>
        {segmentos
          .filter((s) => s.valor > 0)
          .map((s, i) => (
            <div
              key={s.chave}
              onMouseEnter={() => setAtiva(s.chave)}
              className="anim-crescer relative h-full cursor-default transition-opacity first:rounded-l-lg last:rounded-r-lg"
              style={{
                width: `${(s.valor / base) * 100}%`,
                backgroundColor: s.cor,
                opacity: ativa && ativa !== s.chave ? 0.35 : 1,
                animationDelay: `${i * 90}ms`,
              }}
              title={`${s.rotulo}: ${Math.round((s.valor / ref) * 100)}%`}
            />
          ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {segmentos.map((s) => {
          const conteudo = (
            <>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.cor }} />
                {s.emoji} {s.rotulo}
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className={cn('text-sm font-bold tabular-nums', s.chave === 'faltou' ? 'text-negative' : 'text-gray-900')}>
                  <ValorMonetario valor={s.valor} />
                </span>
                <span className="text-[11px] text-gray-400">{Math.round((s.valor / ref) * 100)}%</span>
              </span>
            </>
          );
          const cls = cn('rounded-xl px-2 py-1.5 transition', ativa === s.chave ? 'bg-gray-50' : 'hover:bg-gray-50', ativa && ativa !== s.chave && 'opacity-50');
          return s.href ? (
            <a key={s.chave} href={s.href} className={cn(cls, 'block')} onMouseEnter={() => setAtiva(s.chave)} onMouseLeave={() => setAtiva(null)}>
              {conteudo}
            </a>
          ) : (
            <div key={s.chave} className={cls} onMouseEnter={() => setAtiva(s.chave)} onMouseLeave={() => setAtiva(null)}>
              {conteudo}
            </div>
          );
        })}
      </div>
    </div>
  );
}
