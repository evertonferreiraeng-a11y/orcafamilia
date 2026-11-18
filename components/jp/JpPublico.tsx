'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconSearch } from '@/components/icons';
import { ResumoJpTopo } from '@/components/jp/ResumoJpTopo';
import { MolduraJp } from '@/components/jp/Decoracao';
import { fonteSerif } from '@/lib/jpFontes';
import { cn } from '@/lib/utils';
import { RESPOSTAS, agruparConvites, resumoJp } from '@/lib/jp';
import type { JpConvidadoPublico, RespostaJp } from '@/types/database';

const ROTULO: Record<RespostaJp, { texto: string; classe: string; ponto: string }> = {
  sim: { texto: 'Vai', classe: 'bg-[#eaf0f8] text-[#3f6aa6]', ponto: 'bg-[#3f6aa6]' },
  nao: { texto: 'Não vai', classe: 'bg-[#f6ecec] text-[#a46a6a]', ponto: 'bg-[#c9a3a3]' },
  pendente: { texto: 'Pendente', classe: 'bg-[#fbf3df] text-[#8a6a1e]', ponto: 'bg-[#e3c47c]' },
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
    <MolduraJp className={cn('min-h-screen', fonteSerif.className)}>
    <main className="px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-[1800px] space-y-4">
        <ResumoJpTopo resumo={resumo} subtitulo={`Somente visualização · atualizado às ${atualizadoAs}`} />

        <section className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9db0cb]" />
            <input className="w-full rounded-full border border-[#d5e0ee] bg-white/90 py-2 pl-10 pr-4 text-sm text-[#2f5288] placeholder:text-[#9db0cb] focus:border-[#3f6aa6] focus:outline-none focus:ring-1 focus:ring-[#3f6aa6]" placeholder="Buscar convidado ou convite" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          <div className="flex rounded-full border border-[#d5e0ee] bg-white/90 p-1 text-xs font-semibold">
            {([{ id: 'todos', rotulo: 'Todos' }, ...RESPOSTAS] as { id: RespostaJp | 'todos'; rotulo: string }[]).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setFiltro(r.id)}
                className={cn('flex-1 rounded-full px-3 py-1.5 transition-colors', filtro === r.id ? 'bg-[#3f6aa6] text-white shadow-sm' : 'text-[#5d7aa3]')}
              >
                {r.rotulo}
                {r.id !== 'todos' && <span className="ml-1 tabular-nums opacity-70">{resumo[r.id]}</span>}
              </button>
            ))}
          </div>
        </section>

        {grupos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#cfdcee] bg-white/70 px-4 py-8 text-center text-sm italic text-[#7c93b5]">Nenhum convidado com esses filtros.</p>
        ) : (
          <div className="grid items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {grupos.map((g) => {
              const vai = g.pessoas.some((p) => p.resposta === 'sim');
              const enviado = g.pessoas.every((p) => p.enviado);
              return (
                <article key={g.convite} className="overflow-hidden rounded-3xl border border-[#dfe7f2] bg-white/90 shadow-[0_8px_30px_-22px_rgba(44,79,134,0.5)]">
                  <header className="flex items-center gap-2 border-b border-[#e6edf6] bg-gradient-to-b from-[#f5f8fc] to-white px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-semibold italic text-[#2f5288]">{g.convite}</h2>
                      <p className="truncate text-xs text-[#8aa0bf]">
                        {g.pessoas.length} {g.pessoas.length === 1 ? 'pessoa' : 'pessoas'} · {enviado ? 'convite enviado' : 'convite não enviado'}
                      </p>
                    </div>
                    {vai && <span className="shrink-0 rounded-full border border-[#ecd9a8] bg-[#fbf3df] px-2.5 py-1 text-[11px] font-semibold text-[#8a6a1e]">Família vai · brinde</span>}
                  </header>
                  <ul className="divide-y divide-[#eef2f8]">
                    {g.visiveis.map((p, i) => (
                      <li key={`${p.nome}-${i}`} className="flex items-center gap-2 px-4 py-2.5">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', ROTULO[p.resposta].ponto)} />
                        <span className="min-w-0 flex-1 truncate text-sm text-[#2f5288]">{p.nome}</span>
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
    </MolduraJp>
  );
}
