'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adicionarEtapa, alternarEtapa, excluirEtapa, excluirPlano, mudarStatusPlano, registrarValor } from '@/app/(dashboard)/vida/actions';
import { pilarPorNumero } from '@/lib/vida/pilares';
import { ROTULO_FONTE } from '@/lib/vida/planos';
import type { VidaEtapa, VidaIndicador, VidaPlano, VidaRegistro } from '@/types/database';
import { cn } from '@/lib/utils';

type Status = VidaPlano['status'];
const ABAS: { s: Status; rotulo: string }[] = [
  { s: 'ativo', rotulo: 'Ativos' },
  { s: 'pausado', rotulo: 'Pausados' },
  { s: 'concluido', rotulo: 'Concluídos' },
];

const hojeStr = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const dataBR = (d: string | null) => (d ? d.split('-').reverse().join('/') : '');
const fmt = (v: number | null | undefined, unidade: string) =>
  v == null
    ? '—'
    : unidade === 'R$'
    ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${unidade ? ` ${unidade}` : ''}`;

function progressoIndicador(ind: VidaIndicador, atual: number | null): number | null {
  if (atual == null || ind.meta == null) return null;
  const meta = Number(ind.meta);
  const ini = ind.inicial != null ? Number(ind.inicial) : null;
  if (ind.direcao === 'descer') {
    if (ini == null || ini <= meta) return atual <= meta ? 100 : 0;
    return Math.max(0, Math.min(100, ((ini - atual) / (ini - meta)) * 100));
  }
  const base = ini != null && ini < meta ? ini : 0;
  if (meta <= base) return atual >= meta ? 100 : 0;
  return Math.max(0, Math.min(100, ((atual - base) / (meta - base)) * 100));
}

function Sparkline({ valores, descer }: { valores: number[]; descer: boolean }) {
  if (valores.length < 2) return null;
  const w = 90;
  const h = 26;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const pts = valores.map((v, i) => `${(i / (valores.length - 1)) * w},${h - 3 - ((v - min) / (max - min || 1)) * (h - 6)}`).join(' ');
  const melhorou = descer ? valores[valores.length - 1] <= valores[0] : valores[valores.length - 1] >= valores[0];
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline points={pts} fill="none" stroke={melhorou ? '#10b981' : '#ef4444'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IndicadorLinha({ ind, registros }: { ind: VidaIndicador; registros: VidaRegistro[] }) {
  const router = useRouter();
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const regs = registros.filter((r) => r.indicador_id === ind.id).sort((a, b) => a.data.localeCompare(b.data));
  const atual = regs.length ? Number(regs[regs.length - 1].valor) : null;
  const pct = progressoIndicador(ind, atual);
  const auto = ind.fonte !== 'manual';

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(valor.replace(/\./g, '').replace(',', '.'));
    if (!valor.trim() || !Number.isFinite(n)) return;
    setSalvando(true);
    await registrarValor(ind.id, n);
    setSalvando(false);
    setValor('');
    router.refresh();
  }

  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-gray-600">
            📏 {ind.nome} {auto && <span title={ROTULO_FONTE[ind.fonte]}>⚡</span>}
          </p>
          <p className="text-sm">
            <b className="tabular-nums text-gray-900">{fmt(atual, ind.unidade)}</b>
            <span className="text-xs text-gray-400"> / meta {fmt(ind.meta, ind.unidade)}</span>
          </p>
        </div>
        <Sparkline valores={regs.slice(-12).map((r) => Number(r.valor))} descer={ind.direcao === 'descer'} />
        {pct != null && <span className={cn('w-10 shrink-0 text-right text-xs font-bold tabular-nums', pct >= 100 ? 'text-emerald-600' : 'text-gray-600')}>{Math.round(pct)}%</span>}
      </div>
      {pct != null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
          <span className={cn('anim-crescer block h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : 'bg-violet-500')} style={{ width: `${pct}%` }} />
        </div>
      )}
      {auto ? (
        <p className="mt-1 text-[10px] text-gray-400">{ROTULO_FONTE[ind.fonte]} · atualiza sozinho</p>
      ) : (
        <form onSubmit={registrar} className="mt-2 flex gap-1.5">
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="decimal"
            placeholder={`Valor de hoje${ind.unidade ? ` (${ind.unidade})` : ''}`}
            className="input-field h-8 flex-1 py-1 text-xs"
          />
          <button type="submit" disabled={salvando || !valor.trim()} className="btn-secondary h-8 px-2.5 py-1 text-xs">
            {salvando ? '...' : 'Registrar'}
          </button>
        </form>
      )}
    </div>
  );
}

function PlanoCard({ plano, etapas, indicadores, registros }: { plano: VidaPlano; etapas: VidaEtapa[]; indicadores: VidaIndicador[]; registros: VidaRegistro[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [feitas, setFeitas] = useState<Record<string, boolean>>(() => Object.fromEntries(etapas.map((e) => [e.id, e.feita])));
  const [aberto, setAberto] = useState(plano.status === 'ativo');
  const [novaEtapa, setNovaEtapa] = useState('');
  const [novaData, setNovaData] = useState('');
  const p = pilarPorNumero(plano.pilar);
  const hoje = hojeStr();
  const total = etapas.length;
  const nFeitas = etapas.filter((e) => feitas[e.id]).length;
  const pct = total ? (nFeitas / total) * 100 : 0;
  const atrasadas = etapas.filter((e) => !feitas[e.id] && e.prazo && e.prazo < hoje).length;
  const proxima = etapas.find((e) => !feitas[e.id]);
  const diasPrazo = plano.prazo ? Math.ceil((new Date(`${plano.prazo}T00:00:00`).getTime() - new Date(`${hoje}T00:00:00`).getTime()) / 86_400_000) : null;

  function alternar(e: VidaEtapa) {
    const novo = !feitas[e.id];
    setFeitas((f) => ({ ...f, [e.id]: novo }));
    startTransition(async () => {
      const r = await alternarEtapa(e.id, novo);
      if (r.error) setFeitas((f) => ({ ...f, [e.id]: !novo }));
    });
  }

  async function adicionar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!novaEtapa.trim()) return;
    await adicionarEtapa(plano.id, novaEtapa, novaData || null);
    setNovaEtapa('');
    setNovaData('');
    router.refresh();
  }

  async function status(s: Status) {
    await mudarStatusPlano(plano.id, s);
    router.refresh();
  }

  async function excluir() {
    if (!window.confirm(`Excluir o plano “${plano.titulo}”? Etapas e histórico dos indicadores serão apagados.`)) return;
    await excluirPlano(plano.id);
    router.refresh();
  }

  return (
    <article className="anim-subir overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
      <button type="button" onClick={() => setAberto((v) => !v)} className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-gray-50/60">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: `${p?.cor ?? '#7c3aed'}1a` }}>
          {p?.emoji ?? '🗂️'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-gray-900">{plano.titulo}</span>
          <span className="block truncate text-xs text-gray-500">
            {p ? `${p.curto} · ` : ''}
            {total ? `${nFeitas}/${total} etapas` : 'sem etapas'}
            {plano.prazo && ` · até ${dataBR(plano.prazo)}${diasPrazo != null && plano.status === 'ativo' ? (diasPrazo >= 0 ? ` (${diasPrazo} dias)` : ' (prazo passou)') : ''}`}
            {atrasadas > 0 && <span className="font-semibold text-red-600"> · {atrasadas} atrasada(s)</span>}
          </span>
        </span>
        <span className="hidden w-28 shrink-0 sm:block">
          <span className="block h-2 overflow-hidden rounded-full bg-gray-100">
            <span className={cn('block h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : 'bg-violet-500')} style={{ width: `${pct}%` }} />
          </span>
          <span className="mt-0.5 block text-right text-[11px] font-semibold tabular-nums text-gray-500">{Math.round(pct)}%</span>
        </span>
        <span className={cn('text-gray-300 transition-transform', aberto && 'rotate-90')}>›</span>
      </button>

      {aberto && (
        <div className="space-y-4 border-t border-gray-100 px-4 py-4">
          {(plano.objetivo || plano.resumo) && (
            <div className="space-y-1 text-sm">
              {plano.objetivo && <p className="text-gray-800">🎯 {plano.objetivo}</p>}
              {plano.resumo && <p className="whitespace-pre-line text-xs leading-relaxed text-gray-500">{plano.resumo}</p>}
            </div>
          )}

          {proxima && plano.status === 'ativo' && (
            <p className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-800">
              👉 <b>Próximo passo:</b> {proxima.titulo}
              {proxima.prazo && <span className="text-violet-500"> · até {dataBR(proxima.prazo)}</span>}
            </p>
          )}

          {indicadores.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2">
              {indicadores.map((i) => (
                <IndicadorLinha key={i.id} ind={i} registros={registros} />
              ))}
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Etapas</p>
            <ul className="space-y-1">
              {etapas.map((e) => {
                const ok = feitas[e.id];
                const atrasada = !ok && e.prazo && e.prazo < hoje;
                return (
                  <li key={e.id} className="group flex items-start gap-2.5 rounded-xl px-2 py-1.5 hover:bg-gray-50">
                    <button
                      type="button"
                      onClick={() => alternar(e)}
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] font-bold transition',
                        ok ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 hover:border-violet-400'
                      )}
                      aria-label={ok ? 'Desmarcar etapa' : 'Marcar etapa como feita'}
                    >
                      {ok && '✓'}
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm', ok ? 'text-gray-400 line-through' : 'text-gray-800')}>{e.titulo}</span>
                      {e.detalhe && <span className="block text-xs text-gray-500">{e.detalhe}</span>}
                    </span>
                    {e.prazo && <span className={cn('shrink-0 text-[11px] tabular-nums', atrasada ? 'font-semibold text-red-600' : 'text-gray-400')}>{dataBR(e.prazo)}</span>}
                    <button
                      type="button"
                      onClick={async () => {
                        await excluirEtapa(e.id);
                        router.refresh();
                      }}
                      className="shrink-0 text-xs text-gray-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                      aria-label="Excluir etapa"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
            <form onSubmit={adicionar} className="mt-2 flex gap-1.5">
              <input value={novaEtapa} onChange={(e) => setNovaEtapa(e.target.value)} placeholder="+ Nova etapa" className="input-field h-9 flex-1 py-1 text-sm" />
              <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="input-field h-9 w-36 py-1 text-xs" aria-label="Prazo" />
              <button type="submit" disabled={!novaEtapa.trim()} className="btn-secondary h-9 px-3 py-1 text-xs">
                Adicionar
              </button>
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-xs">
            <Link
              href={`/vida/conversas?${plano.pilar ? `pilar=${plano.pilar}&` : ''}texto=${encodeURIComponent(`Vamos revisar meu plano "${plano.titulo}". Como estou indo e o que ajustar?`)}`}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              💬 Revisar com o mentor
            </Link>
            {plano.status !== 'concluido' && (
              <button type="button" onClick={() => status(plano.status === 'ativo' ? 'pausado' : 'ativo')} className="btn-secondary px-3 py-1.5 text-xs">
                {plano.status === 'ativo' ? '⏸️ Pausar' : '▶️ Retomar'}
              </button>
            )}
            {plano.status !== 'concluido' ? (
              <button type="button" onClick={() => status('concluido')} className="btn-secondary px-3 py-1.5 text-xs">
                🏁 Concluir
              </button>
            ) : (
              <button type="button" onClick={() => status('ativo')} className="btn-secondary px-3 py-1.5 text-xs">
                ↩️ Reabrir
              </button>
            )}
            <button type="button" onClick={excluir} className="ml-auto text-xs text-red-500 hover:underline">
              Excluir plano
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export function PlanosVida({
  planos,
  etapas,
  indicadores,
  registros,
}: {
  planos: VidaPlano[];
  etapas: VidaEtapa[];
  indicadores: VidaIndicador[];
  registros: VidaRegistro[];
}) {
  const [aba, setAba] = useState<Status>('ativo');
  const lista = planos.filter((p) => p.status === aba);
  const ativos = planos.filter((p) => p.status === 'ativo');
  const etapasAtivas = etapas.filter((e) => ativos.some((p) => p.id === e.plano_id));
  const hoje = hojeStr();
  const pendSemana = etapasAtivas.filter((e) => !e.feita && e.prazo && e.prazo <= new Date(Date.now() + 7 * 86_400_000).toLocaleDateString('sv-SE')).length;
  const atrasadas = etapasAtivas.filter((e) => !e.feita && e.prazo && e.prazo < hoje).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-900">🗂️ Meus planos</h1>
          <p className="text-sm text-gray-500">
            {ativos.length} ativo(s)
            {pendSemana > 0 && ` · ${pendSemana} etapa(s) para os próximos 7 dias`}
            {atrasadas > 0 && <span className="font-semibold text-red-600"> · {atrasadas} atrasada(s)</span>}
          </p>
        </div>
        <Link href="/vida/dividas" className="btn-secondary">
          🧾 Plano de dívidas
        </Link>
        <Link href={`/vida/conversas?texto=${encodeURIComponent('Quero montar um novo plano. Me ajude a definir objetivo, etapas e indicadores.')}`} className="btn-primary">
          + Criar plano com o mentor
        </Link>
      </div>

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 text-sm sm:w-fit">
        {ABAS.map((a) => (
          <button
            key={a.s}
            type="button"
            onClick={() => setAba(a.s)}
            className={cn('flex-1 rounded-lg px-3 py-1.5 font-medium transition sm:flex-none', aba === a.s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800')}
          >
            {a.rotulo} <span className="text-xs text-gray-400">{planos.filter((p) => p.status === a.s).length}</span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        aba === 'ativo' ? (
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { emoji: '🧾', titulo: 'Sair das dívidas', texto: 'Simule a ordem de pagamento com seus números reais.', href: '/vida/dividas' },
              { emoji: '💼', titulo: 'Trocar de emprego / crescer', texto: 'Monte com o mentor um plano de carreira com etapas.', href: `/vida/conversas?pilar=4&texto=${encodeURIComponent('Quero um plano para crescer na carreira ou trocar de emprego. Me pergunte o que precisar.')}` },
              { emoji: '🧠', titulo: 'Saúde mental', texto: 'Hábitos pequenos e realistas para ter mais equilíbrio.', href: `/vida/conversas?pilar=2&texto=${encodeURIComponent('Quero um plano simples para cuidar da minha saúde mental. Me pergunte o que precisar.')}` },
            ].map((s) => (
              <Link key={s.titulo} href={s.href} className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-5 transition hover:border-violet-300 hover:bg-violet-50">
                <span className="text-3xl">{s.emoji}</span>
                <span className="mt-2 block font-semibold text-gray-900">{s.titulo}</span>
                <span className="block text-sm text-gray-600">{s.texto}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white/60 px-4 py-10 text-center text-sm text-gray-500">Nenhum plano aqui.</p>
        )
      ) : (
        <div className="space-y-3">
          {lista.map((p) => (
            <PlanoCard
              key={p.id}
              plano={p}
              etapas={etapas.filter((e) => e.plano_id === p.id).sort((a, b) => a.ordem - b.ordem)}
              indicadores={indicadores.filter((i) => i.plano_id === p.id).sort((a, b) => a.ordem - b.ordem)}
              registros={registros}
            />
          ))}
        </div>
      )}
    </div>
  );
}
