'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { salvarAvaliacao } from '@/app/(dashboard)/vida/actions';
import { PILARES, corNota } from '@/lib/vida/pilares';
import type { VidaAvaliacao } from '@/types/database';
import { cn } from '@/lib/utils';

type Av = Pick<VidaAvaliacao, 'mes' | 'pilar' | 'nota' | 'situacao' | 'problema' | 'objetivo' | 'proxima_acao' | 'indicador' | 'origem' | 'atualizado_em'>;

const CAMPOS = [
  { chave: 'situacao', rotulo: 'Situação', emoji: '📍' },
  { chave: 'problema', rotulo: 'Principal problema', emoji: '⚠️' },
  { chave: 'objetivo', rotulo: 'Objetivo', emoji: '🎯' },
  { chave: 'proxima_acao', rotulo: 'Próxima ação', emoji: '👉' },
  { chave: 'indicador', rotulo: 'Indicador', emoji: '📏' },
] as const;

const nomeMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};
const mesDesloc = (mes: string, d: number) => {
  const [a, m] = mes.split('-').map(Number);
  const x = new Date(a, m - 1 + d, 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-01`;
};
const fmtNota = (n: number | null | undefined) => (n == null ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));

export function PainelVida({
  mes,
  mesAtual,
  avaliacoes,
  historico,
  totalConversas,
  chaveOk,
}: {
  mes: string;
  mesAtual: string;
  avaliacoes: Av[];
  historico: Av[]; // últimos 6 meses (inclui o mês exibido)
  totalConversas: number;
  chaveOk: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<number | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const anterior = mesDesloc(mes, -1);
  const doMes = (m: string, p: number) => historico.find((a) => a.mes === m && a.pilar === p);
  const avaliadas = avaliacoes.filter((a) => a.nota != null);
  const media = avaliadas.length ? avaliadas.reduce((s, a) => s + Number(a.nota), 0) / avaliadas.length : null;
  const antes = historico.filter((a) => a.mes === anterior && a.nota != null);
  const mediaAntes = antes.length ? antes.reduce((s, a) => s + Number(a.nota), 0) / antes.length : null;
  const focos = [...avaliadas].sort((a, b) => Number(a.nota) - Number(b.nota)).slice(0, 3);
  const meses6 = Array.from({ length: 6 }, (_, i) => mesDesloc(mes, i - 5));
  const ehMesAtual = mes === mesAtual;

  async function atualizarComIA() {
    setAtualizando(true);
    setAviso(null);
    try {
      const r = await fetch('/api/vida/avaliar', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? 'Não foi possível atualizar.');
      setAviso({ tipo: 'ok', texto: j.atualizados ? `✨ ${j.atualizados} pilar(es) atualizados com base nas conversas.` : 'As conversas ainda não têm informação suficiente para avaliar os pilares. Converse mais com o mentor.' });
      router.refresh();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Erro ao atualizar.' });
    } finally {
      setAtualizando(false);
    }
  }

  const pilarEditando = PILARES.find((p) => p.n === editando);
  const avEditando = avaliacoes.find((a) => a.pilar === editando);

  return (
    <div className="space-y-5">
      {/* topo */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-600 to-fuchsia-500 px-6 py-6 text-white shadow-elevated sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="anim-subir relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full bg-white/15 ring-4 ring-white/20">
            <span className="text-3xl font-bold tabular-nums">{fmtNota(media)}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/75">média</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">🧭 Mentor de Vida · {nomeMes(mes)}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">Painel dos 10 pilares</h1>
            <p className="mt-1.5 text-sm text-white/85">
              {avaliadas.length}/10 pilares avaliados
              {media != null && mediaAntes != null && (
                <>
                  {' · '}
                  {media >= mediaAntes ? '▲' : '▼'} {fmtNota(Math.abs(media - mediaAntes))} em relação a {nomeMes(anterior).split(' ')[0]}
                </>
              )}
              {focos.length > 0 && <> · foco agora: {focos.map((f) => PILARES[f.pilar - 1].curto).join(', ')}</>}
            </p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <Link href="/vida/conversas" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-violet-700 shadow-soft transition hover:bg-violet-50">
            💬 Conversar com o mentor
          </Link>
          <Link href="/vida/planos" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25">
            🗂️ Meus planos
          </Link>
          {ehMesAtual && (
            <button
              type="button"
              onClick={atualizarComIA}
              disabled={!chaveOk || atualizando || totalConversas === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25 disabled:opacity-50"
              title={totalConversas === 0 ? 'Converse com o mentor primeiro' : 'A IA lê as conversas e atualiza o painel deste mês'}
            >
              {atualizando ? '⏳ Analisando conversas...' : '✨ Atualizar painel com a IA'}
            </button>
          )}
          <span className="ml-auto flex items-center gap-1">
            <Link href={`/vida?mes=${anterior.slice(0, 7)}`} className="rounded-lg px-2 py-1 text-sm text-white/80 hover:bg-white/15" aria-label="Mês anterior">
              ‹
            </Link>
            <span className="text-xs capitalize text-white/80">{nomeMes(mes)}</span>
            {!ehMesAtual && (
              <Link href={`/vida?mes=${mesDesloc(mes, 1).slice(0, 7)}`} className="rounded-lg px-2 py-1 text-sm text-white/80 hover:bg-white/15" aria-label="Próximo mês">
                ›
              </Link>
            )}
          </span>
        </div>
      </section>

      {aviso && (
        <p className={cn('rounded-2xl px-4 py-3 text-sm', aviso.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>{aviso.texto}</p>
      )}

      {totalConversas === 0 && ehMesAtual && (
        <Link
          href="/vida/conversas"
          className="anim-subir flex items-center gap-4 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-5 transition hover:border-violet-300 hover:bg-violet-50"
        >
          <span className="text-4xl">🩺</span>
          <span className="flex-1">
            <span className="block font-semibold text-gray-900">Comece pelo diagnóstico</span>
            <span className="block text-sm text-gray-600">
              O mentor vai fazer perguntas, uma de cada vez, sobre os 10 pilares. Depois, use “Atualizar painel com a IA” para preencher as notas.
            </span>
          </span>
          <span className="text-violet-600">→</span>
        </Link>
      )}

      {/* pilares */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {PILARES.map((p, i) => {
          const a = avaliacoes.find((x) => x.pilar === p.n);
          const ant = doMes(anterior, p.n);
          const cor = corNota(a?.nota);
          const delta = a?.nota != null && ant?.nota != null ? Number(a.nota) - Number(ant.nota) : null;
          return (
            <article
              key={p.n}
              className="anim-subir flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-soft transition hover:shadow-card"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <header className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${p.cor}1a` }}>
                  {p.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Pilar {p.n}</p>
                  <h3 className="text-sm font-semibold leading-tight text-gray-900">{p.nome}</h3>
                </div>
                <div className={cn('shrink-0 rounded-xl px-2.5 py-1 text-center', cor.fundo)}>
                  <p className={cn('text-xl font-bold tabular-nums leading-none', cor.texto)}>{fmtNota(a?.nota)}</p>
                  {delta != null && delta !== 0 && (
                    <p className={cn('mt-0.5 text-[10px] font-semibold', delta > 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {delta > 0 ? '▲' : '▼'} {fmtNota(Math.abs(delta))}
                    </p>
                  )}
                </div>
              </header>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <span className={cn('anim-crescer block h-full rounded-full', cor.barra)} style={{ width: `${a?.nota != null ? Number(a.nota) * 10 : 0}%` }} />
              </div>

              <dl className="mt-3 flex-1 space-y-1.5">
                {CAMPOS.map((c) => {
                  const v = a?.[c.chave];
                  if (!v) return null;
                  return (
                    <div key={c.chave} className="text-xs">
                      <dt className="inline font-medium text-gray-500">
                        {c.emoji} {c.rotulo}:{' '}
                      </dt>
                      <dd className="inline text-gray-700">{v}</dd>
                    </div>
                  );
                })}
                {!a && <p className="py-2 text-xs text-gray-400">Ainda sem avaliação neste mês.</p>}
              </dl>

              {/* mini histórico de 6 meses */}
              <div className="mt-3 flex items-end gap-1" title="Notas dos últimos 6 meses">
                {meses6.map((m) => {
                  const h = doMes(m, p.n);
                  return (
                    <span key={m} className="flex flex-1 flex-col items-center gap-0.5">
                      <span
                        className={cn('w-full rounded-sm', h?.nota != null ? corNota(h.nota).barra : 'bg-gray-100', m !== mes && 'opacity-60')}
                        style={{ height: `${h?.nota != null ? 4 + Number(h.nota) * 2 : 4}px` }}
                      />
                    </span>
                  );
                })}
              </div>

              <footer className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs">
                <button type="button" onClick={() => setEditando(p.n)} className="font-semibold text-gray-500 hover:text-gray-800">
                  ✏️ Editar
                </button>
                {a?.origem === 'ia' && <span className="text-[10px] text-gray-400">✨ pela IA</span>}
                <Link href={`/vida/conversas?pilar=${p.n}`} className="ml-auto font-semibold text-violet-600 hover:underline">
                  Conversar →
                </Link>
              </footer>
            </article>
          );
        })}
      </section>

      <Modal open={editando != null} onClose={() => setEditando(null)} title={pilarEditando ? `${pilarEditando.emoji} ${pilarEditando.nome}` : ''}>
        {pilarEditando && (
          <FormAvaliacao
            key={`${mes}-${pilarEditando.n}`}
            mes={mes}
            pilar={pilarEditando.n}
            inicial={avEditando}
            onFechar={() => setEditando(null)}
            onSalvo={() => {
              setEditando(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function FormAvaliacao({ mes, pilar, inicial, onFechar, onSalvo }: { mes: string; pilar: number; inicial?: Av; onFechar: () => void; onSalvo: () => void }) {
  const [nota, setNota] = useState(inicial?.nota != null ? String(inicial.nota) : '');
  const [vals, setVals] = useState<Record<string, string>>({
    situacao: inicial?.situacao ?? '',
    problema: inicial?.problema ?? '',
    objetivo: inicial?.objetivo ?? '',
    proxima_acao: inicial?.proxima_acao ?? '',
    indicador: inicial?.indicador ?? '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const n = nota.trim() === '' ? null : Number(nota.replace(',', '.'));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (n != null && (!Number.isFinite(n) || n < 0 || n > 10)) return setErro('A nota vai de 0 a 10.');
    setSalvando(true);
    const r = await salvarAvaliacao({
      mes,
      pilar,
      nota: n,
      situacao: vals.situacao,
      problema: vals.problema,
      objetivo: vals.objetivo,
      proxima_acao: vals.proxima_acao,
      indicador: vals.indicador,
    });
    setSalvando(false);
    if (r.error) setErro(r.error);
    else onSalvo();
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div>
        <label className="label-field">Nota (0 a 10)</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={n ?? 5}
            onChange={(e) => setNota(e.target.value)}
            className="flex-1 accent-violet-600"
            aria-label="Nota"
          />
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="—" inputMode="decimal" className="input-field w-20 text-center text-lg font-bold" />
        </div>
        <p className="mt-1 text-xs text-gray-400">Deixe em branco se ainda não houver informação suficiente.</p>
      </div>
      {CAMPOS.map((c) => (
        <div key={c.chave}>
          <label className="label-field">
            {c.emoji} {c.rotulo}
          </label>
          <textarea
            value={vals[c.chave]}
            onChange={(e) => setVals((v) => ({ ...v, [c.chave]: e.target.value }))}
            rows={2}
            className="input-field resize-none"
          />
        </div>
      ))}
      {erro && <p className="text-sm text-negative">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onFechar} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={salvando} className="btn-primary">
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
