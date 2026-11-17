'use client';

import { useMemo, useState } from 'react';
import { salvarJurosParcela } from '@/app/(dashboard)/dividas/actions';
import { rotuloMes, simular, type DividaSim, type Estrategia, type ResultadoSim } from '@/lib/quitacao';
import { rotuloSituacaoCredito, valorComDesconto } from '@/lib/dividas';
import type { Divida } from '@/types/database';
import { cn } from '@/lib/utils';

/** Dívida ativa no formato usado pelo plano de quitação. */
export interface DividaPlano {
  id: string;
  nome: string;
  credor: string | null;
  restante: number;
  parcelasRestantes: number | null;
  parcelaEstimada: number | null;
  taxa: number | null;
  parcela: number | null;
  situacao: string;
  situacaoCredito: string | null;
  valorAtual: number | null;
  descontoPct: number | null;
}

export function paraPlano(d: Divida): DividaPlano {
  const restante = Math.max(0, Number(d.valor_total) - Number(d.valor_pago));
  const parcelasRestantes = d.parcelas_total ? Math.max(0, d.parcelas_total - (d.parcelas_pagas ?? 0)) : null;
  return {
    id: d.id,
    nome: d.descricao,
    credor: d.credor,
    restante,
    parcelasRestantes,
    parcelaEstimada: parcelasRestantes ? restante / parcelasRestantes : null,
    taxa: d.taxa_juros_mensal != null ? Number(d.taxa_juros_mensal) : null,
    parcela: d.parcela_mensal != null ? Number(d.parcela_mensal) : null,
    situacao: d.situacao ?? 'ativa',
    situacaoCredito: d.situacao_credito,
    valorAtual: d.valor_atual != null ? Number(d.valor_atual) : null,
    descontoPct: d.desconto_pct != null ? Number(d.desconto_pct) : null,
  };
}

const brl = (v: number, dec = 0) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: dec, maximumFractionDigits: dec });
const num = (s: string) => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const txt = (n: number | null, dec = 2) => (n == null ? '' : n.toLocaleString('pt-BR', { maximumFractionDigits: dec }));

const NOMES: Record<Estrategia, { titulo: string; emoji: string; desc: string }> = {
  avalanche: { titulo: 'Avalanche', emoji: '🏔️', desc: 'Maior juros primeiro — paga menos juros no total' },
  bola_de_neve: { titulo: 'Bola de neve', emoji: '⛄', desc: 'Menor saldo primeiro — quita dívidas mais rápido no começo' },
};

function Grafico({ serie, quitacoes }: { serie: number[]; quitacoes: { nome: string; mes: number }[] }) {
  if (serie.length < 2) return null;
  const W = 640;
  const H = 180;
  const max = Math.max(...serie, 1);
  const x = (i: number) => 30 + (i / (serie.length - 1)) * (W - 40);
  const y = (v: number) => 10 + (1 - v / max) * (H - 40);
  const pts = serie.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const passo = Math.max(1, Math.ceil(serie.length / 8));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Saldo total das dívidas mês a mês">
      <polygon points={`${x(0)},${y(0)} ${pts} ${x(serie.length - 1)},${y(0)}`} fill="#ede9fe" opacity={0.7} />
      <polyline points={pts} fill="none" stroke="#7c3aed" strokeWidth={2.5} strokeLinejoin="round" />
      {quitacoes.map((q) => (
        <g key={q.nome}>
          <circle cx={x(q.mes)} cy={y(serie[q.mes] ?? 0)} r={4.5} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
          <title>{`${q.nome} quitada em ${rotuloMes(q.mes)}`}</title>
        </g>
      ))}
      {serie.map((_, i) =>
        i % passo === 0 || i === serie.length - 1 ? (
          <text key={i} x={x(i)} y={H - 6} fontSize={10} textAnchor="middle" fill="#9ca3af">
            {i === 0 ? 'hoje' : rotuloMes(i)}
          </text>
        ) : null
      )}
      <text x={4} y={14} fontSize={10} fill="#9ca3af">
        {brl(max)}
      </text>
    </svg>
  );
}

export function PlanoQuitacao({ dividas: todas, sobraMedia }: { dividas: Divida[]; sobraMedia: number | null }) {
  const dividas = todas.filter((d) => d.status !== 'quitada').map(paraPlano).filter((d) => d.restante > 0.005);
  const [params, setParams] = useState<Record<string, { taxa: string; parcela: string; incluir: boolean }>>(() =>
    Object.fromEntries(
      dividas.map((d) => [
        d.id,
        { taxa: txt(d.taxa, 3), parcela: txt(d.parcela ?? (d.parcelaEstimada != null ? Math.round(d.parcelaEstimada * 100) / 100 : null)), incluir: d.situacao !== 'standby' },
      ])
    )
  );
  const [salvoId, setSalvoId] = useState<string | null>(null);

  const sim: DividaSim[] = dividas
    .filter((d) => params[d.id]?.incluir)
    .map((d) => ({ id: d.id, nome: d.nome, saldo: d.restante, taxa: num(params[d.id].taxa) ?? 0, parcela: num(params[d.id].parcela) ?? 0 }));
  const minimos = sim.reduce((s, d) => s + Math.min(d.parcela, d.saldo), 0);
  const sugestao = Math.ceil((minimos + Math.max(0, (sobraMedia ?? 0) * 0.5)) / 50) * 50;
  const [valorMensal, setValorMensal] = useState<string>(() => txt(sugestao || null, 0));
  const orcamento = num(valorMensal) ?? minimos;
  const [estrategia, setEstrategia] = useState<Estrategia>('avalanche');
  const semJuros = sim.filter((d) => !d.taxa).length;
  const semParcela = sim.filter((d) => !d.parcela).length;

  const res: Record<Estrategia | 'minimo', ResultadoSim> = useMemo(
    () => ({
      avalanche: simular(sim, orcamento, 'avalanche'),
      bola_de_neve: simular(sim, orcamento, 'bola_de_neve'),
      minimo: simular(sim, minimos, 'avalanche'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(sim), orcamento, minimos]
  );
  const r = res[estrategia];
  const nomePor = new Map(sim.map((d) => [d.id, d]));
  const economiaVsMinimo = res.minimo.meses != null && r.meses != null ? res.minimo.jurosTotal - r.jurosTotal : null;

  const [erro, setErro] = useState<string | null>(null);

  async function salvarParam(id: string) {
    const p = params[id];
    const t = await salvarJurosParcela(id, num(p.taxa), num(p.parcela));
    if (!t.error) {
      setSalvoId(id);
      setTimeout(() => setSalvoId((x) => (x === id ? null : x)), 1500);
    } else setErro(t.error);
  }

  if (!dividas.length) {
    return (
      <div className="card p-8 text-center">
        <span className="text-5xl">🎉</span>
        <p className="mt-2 text-lg font-semibold text-gray-900">Nenhuma dívida em aberto</p>
        <p className="text-sm text-gray-500">Cadastre suas dívidas na aba “Minhas dívidas” para simular a quitação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Informe os juros e a parcela de cada dívida para ver a melhor ordem de pagamento. Os valores ficam salvos na própria dívida.
      </p>

      {/* dívidas */}
      <section className="card overflow-hidden p-0">
        <div className="hidden grid-cols-[24px_1fr_120px_110px_130px] gap-3 border-b border-gray-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 md:grid">
          <span />
          <span>Dívida</span>
          <span className="text-right">Falta pagar</span>
          <span>Juros % a.m.</span>
          <span>Parcela / mês</span>
        </div>
        <ul className="divide-y divide-gray-100">
          {dividas.map((d) => {
            const p = params[d.id];
            const prioridade = r.ordem.indexOf(d.id);
            return (
              <li key={d.id} className={cn('grid grid-cols-[24px_1fr] items-center gap-3 px-4 py-3 md:grid-cols-[24px_1fr_120px_110px_130px]', !p.incluir && 'opacity-50')}>
                <input
                  type="checkbox"
                  checked={p.incluir}
                  onChange={(e) => setParams((x) => ({ ...x, [d.id]: { ...x[d.id], incluir: e.target.checked } }))}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600"
                  aria-label={`Incluir ${d.nome}`}
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold text-gray-900">
                    {p.incluir && prioridade >= 0 && (
                      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', prioridade === 0 ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500')}>
                        {prioridade + 1}
                      </span>
                    )}
                    {d.nome}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {d.credor ?? 'sem credor'}
                    {d.parcelasRestantes != null && ` · ${d.parcelasRestantes} parcela(s) restante(s)`}
                    {d.situacao === 'standby' && ' · em standby'}
                    {rotuloSituacaoCredito(d.situacaoCredito) && <span className={cn(['negativada', 'protestada', 'cobranca_judicial'].includes(d.situacaoCredito ?? '') && 'font-semibold text-red-600')}> · {rotuloSituacaoCredito(d.situacaoCredito)}</span>}
                    {valorComDesconto(d.valorAtual, d.descontoPct) != null && (
                      <span className="font-semibold text-emerald-700"> · quita à vista por {brl(valorComDesconto(d.valorAtual, d.descontoPct)!)} (−{d.descontoPct!.toLocaleString('pt-BR')}%)</span>
                    )}
                  </p>
                </div>
                <p className="col-start-2 text-sm font-bold tabular-nums text-gray-900 md:col-start-auto md:text-right">{brl(d.restante, 2)}</p>
                <label className="col-start-2 flex items-center gap-1 md:col-start-auto">
                  <span className="text-xs text-gray-400 md:hidden">Juros</span>
                  <input
                    value={p.taxa}
                    onChange={(e) => setParams((x) => ({ ...x, [d.id]: { ...x[d.id], taxa: e.target.value } }))}
                    onBlur={() => salvarParam(d.id)}
                    inputMode="decimal"
                    placeholder="ex.: 2,5"
                    className={cn('input-field h-9 w-full py-1 text-right text-sm', !p.taxa && p.incluir && 'border-amber-300 bg-amber-50/50')}
                  />
                  <span className="text-xs text-gray-400">%</span>
                </label>
                <label className="col-start-2 flex items-center gap-1 md:col-start-auto">
                  <span className="text-xs text-gray-400">R$</span>
                  <input
                    value={p.parcela}
                    onChange={(e) => setParams((x) => ({ ...x, [d.id]: { ...x[d.id], parcela: e.target.value } }))}
                    onBlur={() => salvarParam(d.id)}
                    inputMode="decimal"
                    placeholder="mínimo"
                    className={cn('input-field h-9 w-full py-1 text-right text-sm', !p.parcela && p.incluir && 'border-amber-300 bg-amber-50/50')}
                  />
                  <span className={cn('w-4 text-xs text-emerald-600 transition-opacity', salvoId === d.id ? 'opacity-100' : 'opacity-0')}>✓</span>
                </label>
              </li>
            );
          })}
        </ul>
        {(semJuros > 0 || semParcela > 0) && (
          <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            ⚠️ {semJuros > 0 && `${semJuros} sem juros informados (conta como 0% — o resultado fica otimista). `}
            {semParcela > 0 && `${semParcela} sem parcela (sem pagamento mínimo). `}
            Os juros costumam estar na fatura, no contrato ou no app do banco (CET mensal).
          </p>
        )}
      </section>

      {/* valor mensal */}
      <section className="card space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Quanto você consegue colocar nas dívidas por mês?</p>
            <p className="text-xs text-gray-500">
              Parcelas mínimas somam <b>{brl(minimos)}</b>
              {sobraMedia != null && (
                <>
                  {' '}
                  · nos últimos meses sobrou em média <b className={sobraMedia >= 0 ? 'text-positive' : 'text-negative'}>{brl(sobraMedia)}</b>/mês
                </>
              )}
            </p>
          </div>
          <label className="flex items-center gap-2">
            <span className="text-sm text-gray-500">R$</span>
            <input value={valorMensal} onChange={(e) => setValorMensal(e.target.value)} inputMode="decimal" className="input-field h-10 w-32 text-right text-lg font-bold" />
          </label>
        </div>
        <input
          type="range"
          min={Math.floor(minimos)}
          max={Math.max(Math.ceil(minimos) + 3000, Math.ceil(minimos + Math.max(0, sobraMedia ?? 0) * 1.5))}
          step={50}
          value={orcamento}
          onChange={(e) => setValorMensal(e.target.value)}
          className="w-full accent-violet-600"
          aria-label="Valor mensal para dívidas"
        />
        <p className="text-xs text-gray-500">
          Extra além das parcelas: <b>{brl(Math.max(0, orcamento - minimos))}</b>/mês. É esse valor que acelera a quitação.
        </p>
      </section>

      {/* estratégias */}
      <section className="grid gap-3 md:grid-cols-2">
        {(['avalanche', 'bola_de_neve'] as Estrategia[]).map((e) => {
          const x = res[e];
          const outro = res[e === 'avalanche' ? 'bola_de_neve' : 'avalanche'];
          const melhor = x.meses != null && (outro.meses == null || x.jurosTotal <= outro.jurosTotal - 1);
          return (
            <button
              key={e}
              type="button"
              onClick={() => setEstrategia(e)}
              className={cn('rounded-2xl border-2 bg-white p-4 text-left shadow-soft transition', estrategia === e ? 'border-violet-500' : 'border-transparent hover:border-violet-200')}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{NOMES[e].emoji}</span>
                <span className="flex-1">
                  <span className="block font-semibold text-gray-900">{NOMES[e].titulo}</span>
                  <span className="block text-xs text-gray-500">{NOMES[e].desc}</span>
                </span>
                {melhor && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">menos juros</span>}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Livre em</p>
                  <p className="text-sm font-bold text-gray-900">{x.meses != null ? rotuloMes(x.meses) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Meses</p>
                  <p className="text-sm font-bold text-gray-900">{x.meses ?? '∞'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Juros</p>
                  <p className="text-sm font-bold text-gray-900">{brl(x.jurosTotal)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {r.aviso && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">⚠️ {r.aviso}</p>}

      {r.meses != null && (
        <>
          <section className="card space-y-4 p-4">
            {r.ordem[0] && (
              <p className="rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
                👉 <b>Faça agora:</b> pague a parcela mínima de todas e coloque <b>{brl(Math.max(0, orcamento - minimos))}</b> a mais em{' '}
                <b>{nomePor.get(r.ordem[0])?.nome}</b> todo mês. Quando ela acabar, a parcela dela vai para a próxima da lista.
              </p>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Ordem de pagamento e quando cada uma acaba</p>
              <ol className="space-y-2">
                {r.ordem.map((id, i) => {
                  const d = nomePor.get(id)!;
                  const q = r.quitacoes.find((x) => x.id === id);
                  return (
                    <li key={id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', i === 0 ? 'bg-violet-600 text-white' : 'bg-white text-gray-500')}>{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{d.nome}</span>
                        <span className="block text-xs text-gray-500">
                          {brl(d.saldo)} · {d.taxa ? `${d.taxa.toLocaleString('pt-BR')}% a.m.` : 'juros não informados'}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold text-emerald-700">{q ? rotuloMes(q.mes) : '—'}</span>
                        <span className="block text-[11px] text-gray-400">{q ? `mês ${q.mes}` : ''}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Saldo total das dívidas</p>
              <Grafico serie={r.serie} quitacoes={r.quitacoes} />
            </div>
            {economiaVsMinimo != null && economiaVsMinimo > 1 && res.minimo.meses != null && (
              <p className="text-sm text-gray-600">
                💡 Comparado a pagar só as parcelas mínimas ({res.minimo.meses} meses), você termina <b>{res.minimo.meses - r.meses} mês(es) antes</b> e economiza{' '}
                <b className="text-positive">{brl(economiaVsMinimo)}</b> em juros.
              </p>
            )}
          </section>

        </>
      )}
      {erro && <p className="text-sm text-negative">{erro}</p>}
      <p className="text-center text-[11px] text-gray-400">Simulação educativa com juros compostos mensais; não substitui orientação financeira profissional nem a proposta oficial do credor.</p>
    </div>
  );
}
