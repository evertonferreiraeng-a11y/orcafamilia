import Link from 'next/link';
import { Anel, Atencao } from '@/components/estoque/ui';
import { IconOrcamentos, IconPlus, IconTransacoes, IconMetas } from '@/components/icons';
import { formatCurrency } from '@/lib/utils';

type Props = {
  mesNome: string;
  mesParam?: string;
  saldoContas: number;
  saldoPrevisto: number;
  saldoAnterior: number;
  receita: number;
  aReceber: number;
  despesa: number;
  aPagar: number;
  resultadoMes: number;
  previsaoMes: number;
  orcado: number;
  gastoOrcavel: number;
  atrasadas: { qtd: number; valor: number };
  pendentes: { qtd: number; valor: number };
  categoriasAcima: number;
  dividasVencendo: number;
};

function Mini({ rotulo, valor, sub, tom, href }: { rotulo: string; valor: number; sub: string; tom?: 'pos' | 'neg'; href?: string }) {
  const corpo = (
    <>
      <p className="truncate text-[11px] font-medium text-white/75">{rotulo}</p>
      <p className={`truncate text-lg font-bold tabular-nums ${tom === 'neg' ? 'text-red-100' : ''}`}>{formatCurrency(valor)}</p>
      <p className="truncate text-[11px] text-white/75">{sub}</p>
    </>
  );
  const cls = 'min-w-0 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/15';
  return href ? (
    <Link href={href} className={`${cls} transition hover:bg-white/20`}>
      {corpo}
    </Link>
  ) : (
    <div className={cls}>{corpo}</div>
  );
}

/** Abertura do Dashboard do Orçamento: anel do orçamento, números do mês, atalhos e alertas clicáveis. */
export function HeroOrcamento(p: Props) {
  const q = (extra: string) => `${extra}${p.mesParam ? `${extra.includes('?') ? '&' : '?'}mes=${p.mesParam}` : ''}`;
  const temOrcamento = p.orcado > 0;
  const base = temOrcamento ? p.orcado : p.receita + p.aReceber;
  const pct = base > 0 ? ((temOrcamento ? p.gastoOrcavel : p.despesa + p.aPagar) / base) * 100 : 0;
  const estourou = pct > 100;
  const botaoClaro = 'inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25';

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-6 text-white shadow-elevated sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 right-40 h-60 w-60 rounded-full bg-white/[0.06]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center">
          <div className="flex items-center gap-5">
            <Anel pct={Math.min(pct, 100)} cor={estourou ? '#fecaca' : '#fff'}>
              <span className="text-2xl font-bold tabular-nums">{Math.round(pct)}%</span>
              <span className="px-2 text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-white/75">{temOrcamento ? 'do orçado' : 'da receita'}</span>
            </Anel>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Orçamento Familiar</p>
              <h1 className="text-2xl font-bold tracking-tight first-letter:uppercase sm:text-3xl">{p.mesNome}</h1>
              <p className="mt-1 text-sm text-white/80">
                {temOrcamento
                  ? `${formatCurrency(p.gastoOrcavel)} gastos de ${formatCurrency(p.orcado)} orçados`
                  : `${formatCurrency(p.despesa + p.aPagar)} em despesas de ${formatCurrency(p.receita + p.aReceber)} de receita`}
              </p>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-4 xl:ml-auto xl:max-w-3xl">
            <Mini rotulo="🏦 Saldo em conta" valor={p.saldoContas} sub={`previsto: ${formatCurrency(p.saldoPrevisto)}`} tom={p.saldoContas < 0 ? 'neg' : 'pos'} />
            <Mini rotulo="📈 Receitas" valor={p.receita} sub={`a receber: ${formatCurrency(p.aReceber)}`} href={q('/transacoes')} />
            <Mini rotulo="📉 Despesas" valor={p.despesa} sub={`a pagar: ${formatCurrency(p.aPagar)}`} href={q('/transacoes?status=pendente')} />
            <Mini rotulo="⚖️ Resultado do mês" valor={p.resultadoMes} sub={`previsão: ${formatCurrency(p.previsaoMes)}`} tom={p.resultadoMes < 0 ? 'neg' : 'pos'} />
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <Link href={q('/transacoes?nova=1')} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-soft transition hover:bg-brand-50">
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
          <span className="ml-auto text-xs text-white/70">Saldo do mês anterior: {formatCurrency(p.saldoAnterior)}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Atencao
          href={q('/transacoes?status=pendente')}
          valor={p.atrasadas.qtd}
          rotulo={p.atrasadas.qtd ? `Contas atrasadas · ${formatCurrency(p.atrasadas.valor)}` : 'Contas atrasadas'}
          cor="bg-red-50 text-red-600"
          ok="nenhuma atrasada"
        />
        <Atencao
          href={q('/transacoes?status=pendente')}
          valor={p.pendentes.qtd}
          rotulo={p.pendentes.qtd ? `A pagar no mês · ${formatCurrency(p.pendentes.valor)}` : 'A pagar no mês'}
          cor="bg-amber-50 text-amber-600"
          ok="tudo pago"
        />
        <Atencao href={q('/orcamentos')} valor={p.categoriasAcima} rotulo="Categorias acima do orçado" cor="bg-orange-50 text-orange-600" ok="todas dentro do orçado" />
        <Atencao href="/dividas" valor={p.dividasVencendo} rotulo="Dívidas vencendo (7 dias)" cor="bg-sky-50 text-sky-600" ok="nada nos próximos dias" />
      </section>
    </>
  );
}
