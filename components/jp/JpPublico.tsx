'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconSearch } from '@/components/icons';
import { ResumoJpTopo } from '@/components/jp/ResumoJpTopo';
import { cn } from '@/lib/utils';
import { RESPOSTAS, agruparConvites, resumoJp } from '@/lib/jp';
import type { JpConvidadoPublico, RespostaJp } from '@/types/database';

const ROTULO: Record<RespostaJp, { texto: string; classe: string; ponto: string }> = {
  sim: { texto: 'Vai', classe: 'bg-emerald-50 text-emerald-700', ponto: 'bg-emerald-500' },
  nao: { texto: 'Não vai', classe: 'bg-red-50 text-red-600', ponto: 'bg-red-500' },
  pendente: { texto: 'Pendente', classe: 'bg-amber-50 text-amber-700', ponto: 'bg-amber-400' },
};

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Link de acompanhamento do JP: somente leitura, atualiza sozinho a cada minuto. */
export function JpPublico({ lista, atualizadoAs }: { lista: JpConvidadoPublico[]; atualizadoAs: string }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<RespostaJp | 'todos'>('todos');

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [router]);

  const resumo = resumoJp(lista);
  const grupos = useMemo(() => {
    const q = normalizar(busca.trim());
    return agruparConvites(lista)
      .map((g) => ({ ...g, visiveis: g.pessoas.filter((p) => (filtro === 'todos' || p.resposta === filtro) && (!q || normalizar(`${g.convite} ${p.nome}`).includes(q))) }))
      .filter((g) => g.visiveis.length > 0);
  }, [lista, busca, filtro]);

  return (
    <main className="min-h-screen bg-surface px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-[1800px] space-y-4">
        <ResumoJpTopo resumo={resumo} subtitulo={`Somente visualização · atualizado às ${atualizadoAs}`} />

        <section className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Buscar convidado ou convite" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
            {([{ id: 'todos', rotulo: 'Todos' }, ...RESPOSTAS] as { id: RespostaJp | 'todos'; rotulo: string }[]).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setFiltro(r.id)}
                className={cn('flex-1 rounded-lg px-3 py-1.5 transition-colors', filtro === r.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
              >
                {r.rotulo}
                {r.id !== 'todos' && <span className="ml-1 tabular-nums text-gray-400">{resumo[r.id]}</span>}
              </button>
            ))}
          </div>
        </section>

        {grupos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">Nenhum convidado com esses filtros.</p>
        ) : (
          <div className="grid items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {grupos.map((g) => {
              const vai = g.pessoas.some((p) => p.resposta === 'sim');
              const enviado = g.pessoas.every((p) => p.enviado);
              return (
                <article key={g.convite} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
                  <header className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold text-gray-900">{g.convite}</h2>
                      <p className="truncate text-xs text-gray-500">
                        {g.pessoas.length} {g.pessoas.length === 1 ? 'pessoa' : 'pessoas'} · {enviado ? 'convite enviado' : 'convite não enviado'}
                      </p>
                    </div>
                    {vai && <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Família vai</span>}
                  </header>
                  <ul className="divide-y divide-gray-50">
                    {g.visiveis.map((p, i) => (
                      <li key={`${p.nome}-${i}`} className="flex items-center gap-2 px-4 py-2.5">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', ROTULO[p.resposta].ponto)} />
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{p.nome}</span>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', ROTULO[p.resposta].classe)}>{ROTULO[p.resposta].texto}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
