import { IconJp } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { ResumoJp } from '@/lib/jp';

/** Cabeçalho do JP (usado na tela do app e no link de acompanhamento). */
export function ResumoJpTopo({ resumo, acao, subtitulo }: { resumo: ResumoJp; acao?: React.ReactNode; subtitulo?: React.ReactNode }) {
  const pct = (n: number) => (resumo.pessoas ? (n / resumo.pessoas) * 100 : 0);
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-rose-500 to-pink-400 px-5 py-6 text-white shadow-elevated sm:px-8">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25">
            <IconJp className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">JP</h1>
            <p className="text-sm text-white/85">
              {resumo.pessoas} convidados em {resumo.convites} convites
            </p>
            {subtitulo && <p className="text-xs text-white/70">{subtitulo}</p>}
            {acao && <div className="mt-2">{acao}</div>}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[640px] xl:min-w-[900px] xl:grid-cols-6">
          {[
            { rotulo: 'Convites enviados', valor: resumo.convitesEnviados, sub: `de ${resumo.convites} famílias` },
            { rotulo: 'Faltam enviar', valor: resumo.convitesNaoEnviados, sub: `${resumo.naoEnviados} ${resumo.naoEnviados === 1 ? 'pessoa' : 'pessoas'}` },
            { rotulo: 'Vão comparecer', valor: resumo.sim, sub: 'pessoas confirmadas' },
            { rotulo: 'Não vão', valor: resumo.nao, sub: `${resumo.pendente} sem resposta` },
            { rotulo: 'Famílias que vão', valor: resumo.familiasVao, sub: `${resumo.familiasSemResposta} sem resposta`, destaque: true },
            { rotulo: 'Brindes', valor: resumo.familiasVao, sub: '1 por família', destaque: true },
          ].map((x) => (
            <div key={x.rotulo} className={cn('rounded-2xl px-3 py-2.5 ring-1 ring-inset', x.destaque ? 'bg-white/25 ring-white/30' : 'bg-white/10 ring-white/15')}>
              <dt className="truncate text-[11px] font-medium text-white/80">{x.rotulo}</dt>
              <dd className="text-xl font-bold tabular-nums">{x.valor}</dd>
              <dd className="truncate text-[11px] text-white/70">{x.sub}</dd>
            </div>
          ))}
        </dl>
      </div>
      {resumo.pessoas > 0 && (
        <div className="relative mt-5 flex h-2.5 overflow-hidden rounded-full bg-white/20" title="Sim · Não · Pendente">
          <span className="h-full bg-emerald-300" style={{ width: `${pct(resumo.sim)}%` }} />
          <span className="h-full bg-red-300" style={{ width: `${pct(resumo.nao)}%` }} />
          <span className="h-full bg-amber-200" style={{ width: `${pct(resumo.pendente)}%` }} />
        </div>
      )}
    </section>
  );
}
