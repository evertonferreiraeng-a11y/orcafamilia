'use client';

import { useState } from 'react';
import Link from 'next/link';
import { salvarPlano } from '@/app/(dashboard)/vida/actions';
import { pilarPorNumero } from '@/lib/vida/pilares';
import { ROTULO_FONTE, type PropostaPlano } from '@/lib/vida/planos';

const dataBR = (d: string | null) => (d ? d.split('-').reverse().join('/') : null);
const fmt = (v: number | null, unidade: string) =>
  v == null ? '—' : unidade === 'R$' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : `${v.toLocaleString('pt-BR')}${unidade ? ` ${unidade}` : ''}`;

/** Cartão de plano proposto pela IA, com botão para salvar. */
export function PropostaPlanoCard({ plano }: { plano: PropostaPlano }) {
  const [estado, setEstado] = useState<'livre' | 'salvando' | 'salvo'>('livre');
  const [erro, setErro] = useState<string | null>(null);
  const p = pilarPorNumero(plano.pilar);

  async function salvar() {
    setEstado('salvando');
    setErro(null);
    const r = await salvarPlano(plano, 'ia');
    if (r.error) {
      setErro(r.error.includes('vida_planos') ? 'Falta rodar a migração 0025 no Supabase para salvar planos.' : r.error);
      setEstado('livre');
    } else setEstado('salvo');
  }

  return (
    <div className="my-1 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-soft">
      <div className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-white px-4 py-3">
        <span className="text-2xl">{p?.emoji ?? '🗂️'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500">Plano proposto{p ? ` · ${p.curto}` : ''}</p>
          <p className="truncate text-sm font-bold text-gray-900">{plano.titulo}</p>
        </div>
        {plano.prazo && <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">até {dataBR(plano.prazo)}</span>}
      </div>
      <div className="space-y-3 px-4 py-3 text-sm">
        {plano.objetivo && <p className="text-gray-700">🎯 {plano.objetivo}</p>}
        {plano.etapas.length > 0 && (
          <ol className="space-y-1">
            {plano.etapas.map((e, i) => (
              <li key={i} className="flex gap-2 text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  {e.titulo}
                  {e.prazo && <span className="ml-1 text-[11px] text-gray-400">· {dataBR(e.prazo)}</span>}
                  {e.detalhe && <span className="block text-xs text-gray-500">{e.detalhe}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
        {plano.indicadores.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {plano.indicadores.map((i, k) => (
              <span key={k} className="rounded-lg bg-gray-50 px-2 py-1 text-[11px] text-gray-600" title={ROTULO_FONTE[i.fonte]}>
                📏 {i.nome}: meta {fmt(i.meta, i.unidade)} {i.fonte !== 'manual' && '⚡'}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-2.5">
        {erro && <span className="text-xs text-red-600">{erro}</span>}
        {estado === 'salvo' ? (
          <Link href="/vida/planos" className="ml-auto text-sm font-semibold text-emerald-700 hover:underline">
            ✅ Plano salvo · ver em Planos →
          </Link>
        ) : (
          <button type="button" onClick={salvar} disabled={estado === 'salvando'} className="btn-primary ml-auto px-3 py-1.5 text-xs">
            {estado === 'salvando' ? 'Salvando...' : '💾 Salvar plano'}
          </button>
        )}
      </div>
    </div>
  );
}
