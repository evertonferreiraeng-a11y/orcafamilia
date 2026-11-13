'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { emojiCategoria } from '@/lib/emojiCategoria';
import type { CorSinal, Sinal } from '@/lib/saudeFinanceira';
import { cn } from '@/lib/utils';

export interface CategoriaOrcamentoResumo {
  id: string;
  nome: string;
  icone: string | null;
  cor: string | null;
  orcado: number;
  gasto: number;
}

const COR_BORDA: Record<CorSinal, string> = {
  verde: 'border-t-emerald-500',
  amarelo: 'border-t-amber-400',
  vermelho: 'border-t-red-500',
};
const COR_PONTO: Record<CorSinal, string> = {
  verde: 'bg-emerald-500',
  amarelo: 'bg-amber-400',
  vermelho: 'bg-red-500',
};

function LinhaCategoria({ c, href, estourou }: { c: CategoriaOrcamentoResumo; href: string; estourou: boolean }) {
  const pct = c.orcado > 0 ? (c.gasto / c.orcado) * 100 : 0;
  const diff = c.gasto - c.orcado;
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-gray-50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: `${c.cor ?? '#94a3b8'}22` }}>
          {emojiCategoria(c.nome, c.icone)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-700">{c.nome}</span>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold', estourou ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700')}>
              {Math.round(pct)}%
            </span>
          </span>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-100">
            <span className={cn('anim-crescer block h-full rounded-full', estourou ? 'bg-red-500' : 'bg-amber-400')} style={{ width: `${Math.min(100, pct)}%` }} />
          </span>
          <span className="mt-1.5 grid grid-cols-3 gap-2 text-xs">
            <span>
              <span className="block text-[10px] uppercase tracking-wide text-gray-400">Executado</span>
              <b className={cn('tabular-nums', estourou ? 'text-negative' : 'text-gray-900')}>
                <ValorMonetario valor={c.gasto} />
              </b>
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-wide text-gray-400">Orçado</span>
              <b className="tabular-nums text-gray-700">
                <ValorMonetario valor={c.orcado} />
              </b>
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-wide text-gray-400">{estourou ? 'Passou' : 'Resta'}</span>
              <b className={cn('tabular-nums', estourou ? 'text-negative' : 'text-gray-700')}>
                <ValorMonetario valor={Math.abs(diff)} />
              </b>
            </span>
          </span>
        </span>
        <span className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500">›</span>
      </Link>
    </li>
  );
}

/** Os 4 sinais vitais. O de Orçamento abre a lista de categorias estouradas / perto do limite. */
export function SinaisVitais({
  sinais,
  estouradas,
  perto,
  baseHrefDetalhe,
}: {
  sinais: Sinal[];
  estouradas: CategoriaOrcamentoResumo[];
  perto: CategoriaOrcamentoResumo[];
  baseHrefDetalhe: string;
}) {
  const [aberto, setAberto] = useState(false);
  const max = 100 / sinais.length;
  const totalPassou = estouradas.reduce((a, c) => a + (c.gasto - c.orcado), 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {sinais.map((s, i) => {
          const cls = cn(
            'anim-subir group block rounded-2xl border border-t-4 border-gray-100 bg-white px-3.5 py-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-card',
            COR_BORDA[s.cor]
          );
          const conteudo = (
            <>
              <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <span className="text-sm">{s.emoji}</span>
                {s.rotulo}
                <span className={cn('ml-auto h-2 w-2 rounded-full', COR_PONTO[s.cor])} />
              </p>
              <p className="mt-1 truncate text-lg font-bold text-gray-900 group-hover:text-brand-700">{s.valor}</p>
              <p className="truncate text-[11px] text-gray-400">
                {s.detalhe}
                {s.chave === 'orcamento' && (estouradas.length > 0 || perto.length > 0) && <span className="ml-1 font-semibold text-brand-600">· ver lista</span>}
              </p>
            </>
          );
          const props = {
            className: cls,
            style: { animationDelay: `${120 + i * 60}ms` },
            title: `${Math.round((s.pontos / 20) * max)} de ${max} pontos`,
          };
          return s.chave === 'orcamento' && (estouradas.length > 0 || perto.length > 0) ? (
            <button key={s.chave} type="button" onClick={() => setAberto(true)} {...props}>
              {conteudo}
            </button>
          ) : (
            <Link key={s.chave} href={s.href} {...props}>
              {conteudo}
            </Link>
          );
        })}
      </div>

      <Modal open={aberto} onClose={() => setAberto(false)} title="🎯 Orçamento do mês">
        <div className="space-y-4">
          {estouradas.length > 0 && (
            <section>
              <div className="mb-1 flex items-baseline justify-between px-1">
                <h4 className="text-sm font-semibold text-red-600">🔥 Estouraram ({estouradas.length})</h4>
                <span className="text-xs text-gray-500">
                  passaram <b className="text-negative"><ValorMonetario valor={totalPassou} /></b> no total
                </span>
              </div>
              <ul className="divide-y divide-gray-100">
                {estouradas.map((c) => (
                  <LinhaCategoria key={c.id} c={c} href={`${baseHrefDetalhe}${c.id}`} estourou />
                ))}
              </ul>
            </section>
          )}
          {perto.length > 0 && (
            <section>
              <h4 className="mb-1 px-1 text-sm font-semibold text-amber-700">😬 Perto do limite ({perto.length})</h4>
              <ul className="divide-y divide-gray-100">
                {perto.map((c) => (
                  <LinhaCategoria key={c.id} c={c} href={`${baseHrefDetalhe}${c.id}`} estourou={false} />
                ))}
              </ul>
            </section>
          )}
          <Link
            href={sinais.find((s) => s.chave === 'orcamento')?.href ?? '/orcamentos'}
            className="block rounded-xl bg-gray-50 px-3 py-2.5 text-center text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
          >
            Abrir todos os orçamentos do mês →
          </Link>
        </div>
      </Modal>
    </>
  );
}
