'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { emojiCategoria } from '@/lib/emojiCategoria';
import { LIMITE_DIVIDAS, META_SOBRA, type CorSinal, type Sinal } from '@/lib/saudeFinanceira';
import { cn } from '@/lib/utils';

export interface CategoriaOrcamentoResumo {
  id: string;
  nome: string;
  icone: string | null;
  cor: string | null;
  orcado: number;
  gasto: number;
}

export interface DetalhesSinais {
  sobra: {
    receita: number;
    aReceber: number;
    aPagar: number;
    partes: { rotulo: string; emoji: string; valor: number; cor: string }[];
    topGastos: { id: string; nome: string; icone: string | null; cor: string | null; valor: number }[];
  };
  dividas: {
    receita: number;
    totalMes: number;
    lancamentos: { id: string; descricao: string; valor: number; pago: boolean; data: string; sub: string }[];
    ativas: { id: string; descricao: string; credor: string | null; restante: number; total: number; parcelas: string | null; vencimento: string }[];
  };
  contas: {
    contas: { id: string; nome: string; tipo: string; cor: string | null; saldo: number }[];
    atrasadas: { id: string; descricao: string; valor: number; vencimento: string; categoria: string | null }[];
  };
}

const dataCurta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

function Linha({ rotulo, valor, forte, cor, sinal }: { rotulo: React.ReactNode; valor: number; forte?: boolean; cor?: string; sinal?: '+' | '−' | '=' }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-1 py-1.5', forte && 'border-t border-gray-200 pt-2.5')}>
      <span className={cn('text-sm', forte ? 'font-semibold text-gray-900' : 'text-gray-600')}>{rotulo}</span>
      <span className={cn('tabular-nums', forte ? 'text-base font-bold' : 'text-sm font-semibold', cor ?? 'text-gray-900')}>
        {sinal && <span className="mr-1 text-gray-400">{sinal}</span>}
        <ValorMonetario valor={valor} />
      </span>
    </div>
  );
}

function DetalheSobra({ d }: { d: DetalhesSinais['sobra'] }) {
  const despesa = d.partes.reduce((a, p) => a + p.valor, 0);
  const sobra = d.receita - despesa;
  const metaValor = d.receita * META_SOBRA;
  const maxTop = Math.max(1, ...d.topGastos.map((g) => g.valor));
  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gray-50 p-3">
        <Linha rotulo={<>📈 Receita do mês{d.aReceber > 0 && <span className="ml-1 text-xs text-gray-400">(a receber <ValorMonetario valor={d.aReceber} />)</span>}</>} valor={d.receita} cor="text-positive" sinal="+" />
        {d.partes.map((p) => (
          <Linha
            key={p.rotulo}
            rotulo={
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.cor }} />
                {p.emoji} {p.rotulo}
              </span>
            }
            valor={p.valor}
            sinal="−"
          />
        ))}
        <Linha rotulo={sobra >= 0 ? '🐷 Sobra' : '⚠️ Faltou'} valor={Math.abs(sobra)} forte cor={sobra >= 0 ? 'text-positive' : 'text-negative'} sinal="=" />
        {d.aPagar > 0 && <p className="px-1 pt-1 text-[11px] text-gray-400">Inclui <ValorMonetario valor={d.aPagar} /> ainda a pagar neste mês.</p>}
      </section>

      {d.receita > 0 && (
        <section className={cn('rounded-2xl px-4 py-3 text-sm', sobra >= metaValor ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
          {sobra >= metaValor ? (
            <>
              🎯 Meta de {Math.round(META_SOBRA * 100)}% batida: a meta era <b><ValorMonetario valor={metaValor} /></b> e sobraram{' '}
              <b><ValorMonetario valor={sobra - metaValor} /></b> a mais.
            </>
          ) : (
            <>
              🎯 Para chegar a {Math.round(META_SOBRA * 100)}% de sobra (<b><ValorMonetario valor={metaValor} /></b>), faltam{' '}
              <b><ValorMonetario valor={metaValor - sobra} /></b> de economia neste mês.
            </>
          )}
        </section>
      )}

      {d.topGastos.length > 0 && (
        <section>
          <h4 className="mb-2 px-1 text-sm font-semibold text-gray-700">Onde mais saiu dinheiro</h4>
          <ul className="space-y-2">
            {d.topGastos.map((g) => (
              <li key={g.id} className="flex items-center gap-3 px-1">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${g.cor ?? '#94a3b8'}22` }}>
                  {emojiCategoria(g.nome, g.icone)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2 text-sm">
                    <span className="truncate text-gray-800">{g.nome}</span>
                    <b className="tabular-nums text-gray-900"><ValorMonetario valor={g.valor} /></b>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <span className="anim-crescer block h-full rounded-full" style={{ width: `${(g.valor / maxTop) * 100}%`, backgroundColor: g.cor ?? '#94a3b8' }} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DetalheDividas({ d }: { d: DetalhesSinais['dividas'] }) {
  const pct = d.receita > 0 ? (d.totalMes / d.receita) * 100 : null;
  const pagas = d.lancamentos.filter((l) => l.pago).reduce((a, l) => a + l.valor, 0);
  const totalRestante = d.ativas.reduce((a, x) => a + x.restante, 0);
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-gray-50 px-3 py-2.5">
          <p className="text-[11px] text-gray-500">No mês</p>
          <p className="text-base font-bold tabular-nums text-gray-900"><ValorMonetario valor={d.totalMes} /></p>
        </div>
        <div className="rounded-2xl bg-gray-50 px-3 py-2.5">
          <p className="text-[11px] text-gray-500">Da renda</p>
          <p className={cn('text-base font-bold', pct != null && pct > LIMITE_DIVIDAS * 100 ? 'text-negative' : 'text-gray-900')}>
            {pct != null ? `${Math.round(pct)}%` : '—'} <span className="text-[11px] font-normal text-gray-400">/ {Math.round(LIMITE_DIVIDAS * 100)}%</span>
          </p>
        </div>
        <div className="rounded-2xl bg-gray-50 px-3 py-2.5">
          <p className="text-[11px] text-gray-500">Já pago</p>
          <p className="text-base font-bold tabular-nums text-gray-900"><ValorMonetario valor={pagas} /></p>
        </div>
      </section>

      <section>
        <h4 className="mb-1 px-1 text-sm font-semibold text-gray-700">🧾 Parcelas deste mês</h4>
        {d.lancamentos.length === 0 ? (
          <p className="px-1 py-3 text-sm text-gray-500">Nenhum lançamento de dívida neste mês.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {d.lancamentos.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-1 py-2.5">
                <span className={cn('w-12 shrink-0 rounded-lg py-1 text-center text-xs font-semibold tabular-nums', l.pago ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                  {dataCurta(l.data)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800">{l.descricao}</span>
                  <span className="block truncate text-[11px] text-gray-400">
                    {l.pago ? '✓ pago' : 'pendente'}
                    {l.sub && ` · ${l.sub}`}
                  </span>
                </span>
                <b className="shrink-0 text-sm tabular-nums text-gray-900"><ValorMonetario valor={l.valor} /></b>
              </li>
            ))}
          </ul>
        )}
      </section>

      {d.ativas.length > 0 && (
        <section>
          <div className="mb-1 flex items-baseline justify-between px-1">
            <h4 className="text-sm font-semibold text-gray-700">📋 Dívidas em aberto</h4>
            <span className="text-xs text-gray-500">resta <b className="text-gray-800"><ValorMonetario valor={totalRestante} /></b></span>
          </div>
          <ul className="divide-y divide-gray-100">
            {d.ativas.map((x) => {
              const pagoPct = x.total > 0 ? ((x.total - x.restante) / x.total) * 100 : 0;
              return (
                <li key={x.id} className="px-1 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-gray-800">
                      {x.descricao}
                      {x.credor && <span className="ml-1 text-xs font-normal text-gray-400">· {x.credor}</span>}
                    </span>
                    <b className="shrink-0 text-sm tabular-nums text-gray-900"><ValorMonetario valor={x.restante} /></b>
                  </div>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <span className="anim-crescer block h-full rounded-full bg-emerald-500" style={{ width: `${pagoPct}%` }} />
                  </span>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {Math.round(pagoPct)}% quitado{x.parcelas && ` · parcelas ${x.parcelas}`} · próxima {dataCurta(x.vencimento)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function DetalheContas({ d }: { d: DetalhesSinais['contas'] }) {
  const negativas = d.contas.filter((c) => c.saldo < -0.005);
  return (
    <div className="space-y-5">
      <section>
        <h4 className="mb-1 px-1 text-sm font-semibold text-gray-700">🏦 Saldo das contas</h4>
        {d.contas.length === 0 ? (
          <p className="px-1 py-3 text-sm text-gray-500">Nenhuma conta cadastrada.</p>
        ) : (
          <ul className="space-y-1.5">
            {d.contas.map((c) => {
              const neg = c.saldo < -0.005;
              return (
                <li key={c.id} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5', neg ? 'bg-red-50' : 'bg-gray-50')}>
                  <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c.cor ?? '#94a3b8' }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-800">{c.nome}</span>
                    <span className="block text-[11px] capitalize text-gray-400">{c.tipo}</span>
                  </span>
                  <span className={cn('shrink-0 text-sm font-bold tabular-nums', neg ? 'text-negative' : 'text-gray-900')}>
                    {neg && '⚠️ '}
                    <ValorMonetario valor={c.saldo} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {negativas.length > 0 && (
          <p className="mt-2 px-1 text-xs text-gray-500">
            Se o saldo negativo não for real, confira o saldo inicial da conta em Cadastro.
          </p>
        )}
      </section>

      <section>
        <h4 className="mb-1 px-1 text-sm font-semibold text-gray-700">🚨 Contas atrasadas</h4>
        {d.atrasadas.length === 0 ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">🎉 Nenhuma conta atrasada.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {d.atrasadas.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-1 py-2.5">
                <span className="w-12 shrink-0 rounded-lg bg-red-50 py-1 text-center text-xs font-semibold tabular-nums text-red-700">{dataCurta(a.vencimento)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800">{a.descricao}</span>
                  {a.categoria && <span className="block truncate text-[11px] text-gray-400">{a.categoria}</span>}
                </span>
                <b className="shrink-0 text-sm tabular-nums text-negative"><ValorMonetario valor={a.valor} /></b>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
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
  detalhes,
}: {
  sinais: Sinal[];
  estouradas: CategoriaOrcamentoResumo[];
  perto: CategoriaOrcamentoResumo[];
  baseHrefDetalhe: string;
  detalhes: DetalhesSinais;
}) {
  const [aberto, setAberto] = useState<Sinal['chave'] | null>(null);
  const temLista = (chave: Sinal['chave']) => chave !== 'orcamento' || estouradas.length > 0 || perto.length > 0;
  const sinalAberto = sinais.find((s) => s.chave === aberto);
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
                {temLista(s.chave) && <span className="ml-1 font-semibold text-brand-600">· ver detalhes</span>}
              </p>
            </>
          );
          const props = {
            className: cls,
            style: { animationDelay: `${120 + i * 60}ms` },
            title: `${Math.round((s.pontos / 20) * max)} de ${max} pontos`,
          };
          return temLista(s.chave) ? (
            <button key={s.chave} type="button" onClick={() => setAberto(s.chave)} {...props}>
              {conteudo}
            </button>
          ) : (
            <Link key={s.chave} href={s.href} {...props}>
              {conteudo}
            </Link>
          );
        })}
      </div>

      <Modal open={aberto != null} onClose={() => setAberto(null)} title={sinalAberto ? `${sinalAberto.emoji} ${sinalAberto.rotulo}` : ''}>
        {aberto === 'sobra' && <DetalheSobra d={detalhes.sobra} />}
        {aberto === 'dividas' && <DetalheDividas d={detalhes.dividas} />}
        {aberto === 'contas' && <DetalheContas d={detalhes.contas} />}
        {aberto === 'orcamento' && (
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
        )}
        {sinalAberto && aberto !== 'orcamento' && (
          <Link
            href={sinalAberto.href}
            className="mt-4 block rounded-xl bg-gray-50 px-3 py-2.5 text-center text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
          >
            {aberto === 'dividas' ? 'Abrir Dívidas →' : aberto === 'contas' ? 'Ver pendentes em Transações →' : 'Abrir Transações →'}
          </Link>
        )}
      </Modal>
    </>
  );
}
