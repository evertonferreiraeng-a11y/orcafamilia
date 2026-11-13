import Link from 'next/link';
import { IconOrcamentos, IconPlus, IconTransacoes, IconMetas } from '@/components/icons';
import { NotaAnimada } from '@/components/dashboard/NotaAnimada';
import { SinaisVitais, type CategoriaOrcamentoResumo, type DetalhesSinais } from '@/components/dashboard/SinaisVitais';
import { explicarNota, type SaudeFinanceira } from '@/lib/saudeFinanceira';

const COR_ANEL = (nota: number) => (nota >= 80 ? '#4ade80' : nota >= 60 ? '#a3e635' : nota >= 40 ? '#fbbf24' : '#f87171');

export function SaudeFinanceiraCard({
  saude,
  mesNome,
  mesParam,
  estouradas,
  perto,
  baseHrefDetalhe,
  detalhes,
}: {
  saude: SaudeFinanceira;
  mesNome: string;
  mesParam?: string;
  estouradas: CategoriaOrcamentoResumo[];
  perto: CategoriaOrcamentoResumo[];
  baseHrefDetalhe: string;
  detalhes: DetalhesSinais;
}) {
  const q = (extra: string) => `${extra}${mesParam ? `${extra.includes('?') ? '&' : '?'}mes=${mesParam}` : ''}`;
  const botaoClaro =
    'inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25';

  return (
    <section className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-6 text-white shadow-elevated sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 right-40 h-60 w-60 rounded-full bg-white/[0.06]" />

        <div className="anim-subir relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div title={explicarNota(saude)} className="cursor-help">
            <NotaAnimada nota={saude.nota} cor={COR_ANEL(saude.nota)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Saúde financeira · <span className="first-letter:uppercase">{mesNome}</span>
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
              <span className="mr-2">{saude.emoji}</span>
              {saude.titulo}
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-white/85">{saude.diagnostico}</p>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <Link
            href={q('/transacoes?nova=1')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-brand-700 shadow-soft transition hover:bg-brand-50"
          >
            <IconPlus className="h-4 w-4" /> Nova transação
          </Link>
          <Link href={q('/transacoes')} className={botaoClaro}>
            <IconTransacoes className="h-4 w-4" /> Transações
          </Link>
          <Link href={q('/orcamentos')} className={botaoClaro}>
            <IconOrcamentos className="h-4 w-4" /> Orçamentos
          </Link>
          <Link href="/metas" className={botaoClaro}>
            <IconMetas className="h-4 w-4" /> Metas
          </Link>
          <span className="ml-auto hidden text-[11px] text-white/60 sm:inline">passe o mouse na nota para ver a conta</span>
        </div>
      </div>

      <SinaisVitais sinais={saude.sinais} estouradas={estouradas} perto={perto} baseHrefDetalhe={baseHrefDetalhe} detalhes={detalhes} />
    </section>
  );
}
