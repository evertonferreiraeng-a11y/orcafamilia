'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { alternarPagoTransacao } from '@/app/(dashboard)/transacoes/actions';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { cn } from '@/lib/utils';

export type Acao =
  | {
      tipo: 'pagar';
      id: string;
      emoji: string;
      texto: string;
      sub: string;
      valor: number;
      receita: boolean;
      urgente: boolean;
    }
  | {
      tipo: 'link';
      id: string;
      emoji: string;
      texto: string;
      sub?: string;
      valor?: number;
      href: string;
      urgente?: boolean;
    }
  | {
      tipo: 'dica';
      id: string;
      emoji: string;
      texto: string;
    };

/** Lista única do que pede atenção: negativos, vencimentos, estouros e dicas. */
export function AcoesAgoraCard({ acoes }: { acoes: Acao[] }) {
  const [feitas, setFeitas] = useState<Set<string>>(new Set());
  const [ultima, setUltima] = useState<Extract<Acao, { tipo: 'pagar' }> | null>(null);
  const [, startTransition] = useTransition();
  const visiveis = acoes.filter((a) => !feitas.has(a.id));

  function pagar(a: Extract<Acao, { tipo: 'pagar' }>) {
    setFeitas((p) => new Set(p).add(a.id));
    setUltima(a);
    startTransition(() => alternarPagoTransacao(a.id, true));
  }
  function desfazer() {
    if (!ultima) return;
    const a = ultima;
    setFeitas((p) => {
      const n = new Set(p);
      n.delete(a.id);
      return n;
    });
    setUltima(null);
    startTransition(() => alternarPagoTransacao(a.id, false));
  }

  return (
    <div className="card flex h-full flex-col overflow-hidden p-0">
      <div className="flex items-center gap-2 px-4 pb-2 pt-4">
        <p className="text-sm font-semibold text-gray-900">⚡ O que fazer agora</p>
        {visiveis.length > 0 && <span className="rounded-full bg-gray-100 px-2 text-xs font-medium text-gray-500">{visiveis.length}</span>}
      </div>

      {ultima && (
        <div className="anim-subir mx-4 mb-1 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          ✅ <span className="min-w-0 flex-1 truncate">“{ultima.texto}” marcada como {ultima.receita ? 'recebida' : 'paga'}</span>
          <button type="button" onClick={desfazer} className="font-semibold hover:underline">
            Desfazer
          </button>
        </div>
      )}

      <ul className="max-h-[360px] flex-1 overflow-y-auto px-2 pb-2">
        {visiveis.length === 0 ? (
          <li className="flex flex-col items-center justify-center gap-1 py-10 text-center">
            <span className="anim-pop text-4xl">🎉</span>
            <span className="text-sm font-medium text-gray-700">Nada pendente por agora</span>
          </li>
        ) : (
          visiveis.map((a, i) => (
            <li
              key={a.id}
              className={cn('anim-subir flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-gray-50', 'urgente' in a && a.urgente && 'bg-red-50/40')}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-base">{a.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm text-gray-800', a.tipo === 'dica' ? 'leading-snug' : 'truncate font-medium')}>{a.texto}</span>
                {'sub' in a && a.sub && <span className="block truncate text-[11px] text-gray-400">{a.sub}</span>}
              </span>
              {'valor' in a && a.valor != null && (
                <span className={cn('shrink-0 text-sm font-semibold tabular-nums', a.tipo === 'pagar' && a.receita ? 'text-positive' : 'urgente' in a && a.urgente ? 'text-negative' : 'text-gray-900')}>
                  <ValorMonetario valor={a.valor} />
                </span>
              )}
              {a.tipo === 'pagar' && (
                <button
                  type="button"
                  onClick={() => pagar(a)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-500 hover:text-white hover:ring-emerald-500"
                >
                  ✓ {a.receita ? 'Recebi' : 'Paguei'}
                </button>
              )}
              {a.tipo === 'link' && (
                <Link href={a.href} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50">
                  ver →
                </Link>
              )}
            </li>
          ))
        )}
      </ul>

      <Link href="/transacoes?status=pendente" className="border-t border-gray-100 px-4 py-2.5 text-center text-xs font-semibold text-brand-600 transition hover:bg-brand-50">
        Ver todas as pendentes →
      </Link>
    </div>
  );
}
