'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { alternarPagoTransacao } from '@/app/(dashboard)/transacoes/actions';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { emojiCategoria } from '@/lib/emojiCategoria';
import { cn } from '@/lib/utils';

export interface VencimentoItem {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  vencimento: string; // yyyy-MM-dd
  categoriaNome: string | null;
  categoriaIcone: string | null;
  categoriaCor: string | null;
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function diasAte(data: string, hoje: string): number {
  return Math.round((new Date(`${data}T00:00:00`).getTime() - new Date(`${hoje}T00:00:00`).getTime()) / 86_400_000);
}

function grupoDe(dias: number): { chave: string; titulo: string; ordem: number } {
  if (dias < 0) return { chave: 'atrasadas', titulo: '🚨 Atrasadas', ordem: 0 };
  if (dias === 0) return { chave: 'hoje', titulo: '📌 Hoje', ordem: 1 };
  if (dias === 1) return { chave: 'amanha', titulo: '⏰ Amanhã', ordem: 2 };
  if (dias <= 7) return { chave: 'semana', titulo: '🗓️ Próximos 7 dias', ordem: 3 };
  return { chave: 'depois', titulo: '📆 Até 15 dias', ordem: 4 };
}

export function ProximosVencimentosCard({ itens, hoje }: { itens: VencimentoItem[]; hoje: string }) {
  const [pagos, setPagos] = useState<Set<string>>(new Set());
  const [ultimo, setUltimo] = useState<VencimentoItem | null>(null);
  const [, startTransition] = useTransition();

  const visiveis = itens.filter((i) => !pagos.has(i.id));
  const aPagar = visiveis.filter((i) => i.tipo === 'despesa').reduce((a, i) => a + i.valor, 0);
  const aReceber = visiveis.filter((i) => i.tipo === 'receita').reduce((a, i) => a + i.valor, 0);
  const atrasadas = visiveis.filter((i) => diasAte(i.vencimento, hoje) < 0).length;

  const grupos = useMemo(() => {
    const m = new Map<string, { titulo: string; ordem: number; itens: VencimentoItem[] }>();
    for (const i of visiveis) {
      const g = grupoDe(diasAte(i.vencimento, hoje));
      const atual = m.get(g.chave) ?? { titulo: g.titulo, ordem: g.ordem, itens: [] };
      atual.itens.push(i);
      m.set(g.chave, atual);
    }
    return Array.from(m.entries()).sort((a, b) => a[1].ordem - b[1].ordem);
  }, [visiveis, hoje]);

  function marcar(item: VencimentoItem) {
    setPagos((prev) => new Set(prev).add(item.id));
    setUltimo(item);
    startTransition(() => alternarPagoTransacao(item.id, true));
  }

  function desfazer() {
    if (!ultimo) return;
    const item = ultimo;
    setPagos((prev) => {
      const novo = new Set(prev);
      novo.delete(item.id);
      return novo;
    });
    setUltimo(null);
    startTransition(() => alternarPagoTransacao(item.id, false));
  }

  return (
    <div className="card flex h-full flex-col overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-xl">🔔</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Próximos vencimentos</p>
          <p className="truncate text-xs text-gray-500">
            a pagar <b className="text-negative"><ValorMonetario valor={aPagar} /></b>
            {aReceber > 0 && (
              <>
                {' · '}a receber <b className="text-positive"><ValorMonetario valor={aReceber} /></b>
              </>
            )}
          </p>
        </div>
        {atrasadas > 0 && (
          <span className="anim-pop shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{atrasadas} atrasada(s)</span>
        )}
      </div>

      {ultimo && (
        <div className="anim-subir flex items-center gap-2 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
          ✅ <span className="min-w-0 flex-1 truncate">“{ultimo.descricao}” marcada como {ultimo.tipo === 'receita' ? 'recebida' : 'paga'}</span>
          <button type="button" onClick={desfazer} className="font-semibold underline-offset-2 hover:underline">
            Desfazer
          </button>
        </div>
      )}

      <div className="max-h-[380px] flex-1 overflow-y-auto px-2 py-2">
        {grupos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-10 text-center">
            <span className="anim-pop text-4xl">🎉</span>
            <p className="text-sm font-medium text-gray-700">Nada vencendo nos próximos 15 dias</p>
            <p className="text-xs text-gray-400">Tudo em dia por aqui.</p>
          </div>
        ) : (
          grupos.map(([chave, g]) => (
            <div key={chave} className="mb-1">
              <p className={cn('px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide', chave === 'atrasadas' ? 'text-red-600' : 'text-gray-400')}>
                {g.titulo}
              </p>
              <ul>
                {g.itens.map((i) => {
                  const d = new Date(`${i.vencimento}T00:00:00`);
                  const atrasada = chave === 'atrasadas';
                  return (
                    <li key={i.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-gray-50">
                      <span
                        className={cn(
                          'flex w-11 shrink-0 flex-col items-center rounded-lg py-1 leading-none',
                          atrasada ? 'bg-red-50 text-red-700' : chave === 'hoje' ? 'bg-brand-50 text-brand-700' : 'bg-gray-50 text-gray-600'
                        )}
                      >
                        <span className="text-sm font-bold tabular-nums">{String(d.getDate()).padStart(2, '0')}</span>
                        <span className="text-[10px] uppercase">{atrasada ? MESES[d.getMonth()] : DIAS_SEMANA[d.getDay()]}</span>
                      </span>
                      <span className="text-lg" aria-hidden>
                        {i.categoriaNome ? emojiCategoria(i.categoriaNome, i.categoriaIcone) : i.tipo === 'receita' ? '💰' : '🧾'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-800">{i.descricao}</span>
                        <span className="block truncate text-[11px] text-gray-400">{i.categoriaNome ?? 'Sem categoria'}</span>
                      </span>
                      <span className={cn('shrink-0 text-sm font-semibold tabular-nums', i.tipo === 'receita' ? 'text-positive' : 'text-gray-900')}>
                        {i.tipo === 'receita' ? '+' : ''}
                        <ValorMonetario valor={i.valor} />
                      </span>
                      <button
                        type="button"
                        onClick={() => marcar(i)}
                        title={i.tipo === 'receita' ? 'Marcar como recebida' : 'Marcar como paga'}
                        className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-500 hover:text-white hover:ring-emerald-500"
                      >
                        ✓ {i.tipo === 'receita' ? 'Recebi' : 'Paguei'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      <Link href="/transacoes?status=pendente" className="border-t border-gray-100 px-4 py-2.5 text-center text-xs font-semibold text-brand-600 transition hover:bg-brand-50">
        Ver todas as pendentes →
      </Link>
    </div>
  );
}
