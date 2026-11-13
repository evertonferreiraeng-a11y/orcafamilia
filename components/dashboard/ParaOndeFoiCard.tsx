'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { ValorAnimado } from '@/components/ui/ValorAnimado';
import { emojiCategoria, humorOrcamento } from '@/lib/emojiCategoria';
import { cn, formatPercent0 } from '@/lib/utils';

export interface FatiaCategoria {
  id: string;
  nome: string;
  cor: string | null;
  icone: string | null;
  executado: number;
  orcado: number;
}

const CINZA = '#94a3b8';
const TAM = 220;
const RAIO = 92;
const ESPESSURA = 30;

/** Caminho SVG de um arco de rosca entre dois ângulos (radianos, 0 = topo, sentido horário). */
function arco(a0: number, a1: number, r: number, esp: number, cx: number, cy: number): string {
  const ri = r - esp;
  const p = (ang: number, raio: number) => [cx + raio * Math.sin(ang), cy - raio * Math.cos(ang)];
  const grande = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(a0, r);
  const [x1, y1] = p(a1, r);
  const [x2, y2] = p(a1, ri);
  const [x3, y3] = p(a0, ri);
  return `M${x0},${y0} A${r},${r} 0 ${grande} 1 ${x1},${y1} L${x2},${y2} A${ri},${ri} 0 ${grande} 0 ${x3},${y3} Z`;
}

export function ParaOndeFoiCard({ categorias, baseHrefDetalhe }: { categorias: FatiaCategoria[]; baseHrefDetalhe: string }) {
  const hrefDetalhe = (id: string) => `${baseHrefDetalhe}${id}`;
  const router = useRouter();
  const [ativa, setAtiva] = useState<string | null>(null);

  const fatias = categorias.filter((c) => c.executado > 0).sort((a, b) => b.executado - a.executado);
  const total = fatias.reduce((a, c) => a + c.executado, 0);
  const sel = fatias.find((f) => f.id === ativa) ?? null;

  // Ângulos acumulados, com um pequeno respiro entre as fatias.
  const respiro = fatias.length > 1 ? 0.025 : 0;
  let acc = 0;
  const arcos = fatias.map((f) => {
    const ang = (f.executado / (total || 1)) * Math.PI * 2;
    const a0 = acc + respiro / 2;
    const a1 = acc + Math.max(ang - respiro / 2, a0 + 0.001);
    acc += ang;
    return { f, a0, a1, meio: (a0 + a1) / 2 };
  });

  return (
    <div className="card flex h-full flex-col p-4">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-xl">🍩</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Para onde foi o dinheiro</p>
          <p className="text-xs text-gray-500">Passe o mouse para destacar · clique para abrir a categoria</p>
        </div>
      </div>

      {fatias.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center">
          <span className="anim-pop text-4xl">🌱</span>
          <p className="text-sm font-medium text-gray-700">Nenhum gasto lançado neste mês</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-5 md:flex-row md:items-start">
          <div className="relative shrink-0" style={{ width: TAM, height: TAM }} onMouseLeave={() => setAtiva(null)}>
            <svg viewBox={`0 0 ${TAM} ${TAM}`} className="h-full w-full" role="img" aria-label="Gastos do mês por categoria">
              <circle cx={TAM / 2} cy={TAM / 2} r={RAIO - ESPESSURA / 2} fill="none" stroke="#f1f5f9" strokeWidth={ESPESSURA} />
              <g className="anim-pop" style={{ transformOrigin: `${TAM / 2}px ${TAM / 2}px` }}>
              {arcos.map(({ f, a0, a1, meio }) => {
                const destacada = ativa === f.id;
                const apagada = ativa !== null && !destacada;
                const desloc = destacada ? 6 : 0;
                return (
                  <path
                    key={f.id}
                    d={arco(a0, a1, RAIO, ESPESSURA, TAM / 2, TAM / 2)}
                    fill={f.cor ?? CINZA}
                    className="cursor-pointer transition-all duration-200"
                    style={{
                      opacity: apagada ? 0.3 : 1,
                      transform: `translate(${desloc * Math.sin(meio)}px, ${-desloc * Math.cos(meio)}px)`,
                    }}
                    onMouseEnter={() => setAtiva(f.id)}
                    onClick={() => router.push(hrefDetalhe(f.id))}
                  >
                    <title>{`${f.nome}: ${formatPercent0((f.executado / total) * 100)}`}</title>
                  </path>
                );
              })}
              </g>
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
              {sel ? (
                <>
                  <span key={sel.id} className="anim-pop text-3xl">{emojiCategoria(sel.nome, sel.icone)}</span>
                  <span className="mt-0.5 max-w-full truncate text-xs font-semibold text-gray-600">{sel.nome}</span>
                  <span className="text-lg font-bold tabular-nums text-gray-900">
                    <ValorMonetario valor={sel.executado} />
                  </span>
                  <span className="text-[11px] text-gray-500">{formatPercent0((sel.executado / total) * 100)} do total</span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Gasto no mês</span>
                  <span className="text-xl font-bold tabular-nums text-gray-900">
                    <ValorAnimado valor={total} />
                  </span>
                  <span className="text-[11px] text-gray-500">{fatias.length} categoria(s)</span>
                </>
              )}
            </div>
          </div>

          <ul className="w-full min-w-0 flex-1 space-y-0.5">
            {fatias.slice(0, 8).map((f, i) => {
              const pct = (f.executado / total) * 100;
              const humor = humorOrcamento({ orcado: f.orcado, exec: f.executado });
              return (
                <li key={f.id}>
                  <Link
                    href={hrefDetalhe(f.id)}
                    onMouseEnter={() => setAtiva(f.id)}
                    onMouseLeave={() => setAtiva(null)}
                    className={cn(
                      'anim-subir flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition',
                      ativa === f.id ? 'bg-gray-50' : 'hover:bg-gray-50',
                      ativa !== null && ativa !== f.id && 'opacity-50'
                    )}
                    style={{ animationDelay: `${150 + i * 50}ms` }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base" style={{ backgroundColor: `${f.cor ?? CINZA}22` }}>
                      {emojiCategoria(f.nome, f.icone)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-gray-800">{f.nome}</span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                          <ValorMonetario valor={f.executado} />
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <span className="anim-crescer block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: f.cor ?? CINZA, animationDelay: `${200 + i * 50}ms` }} />
                        </span>
                        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-gray-500">{formatPercent0(pct)}</span>
                        <span className="w-5 shrink-0 text-center text-sm" title={humor.dica}>
                          {f.orcado > 0 ? humor.emoji : ''}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {fatias.length > 8 && <li className="px-2 pt-1 text-[11px] text-gray-400">+ {fatias.length - 8} categoria(s) menores</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
