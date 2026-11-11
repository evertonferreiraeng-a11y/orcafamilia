'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { IconEdit, IconPlus, IconCalendario } from '@/components/icons';
import { Anel } from '@/components/estoque/ui';
import { registrarAporteMeta, excluirMeta, type MetaFormState } from '@/app/(dashboard)/metas/actions';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Meta } from '@/types/database';

function BotaoOk() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary px-4" disabled={pending}>
      {pending ? '...' : 'OK'}
    </button>
  );
}

export function MetaCard({ meta: m, onEditar }: { meta: Meta; onEditar: () => void }) {
  const [aporteAberto, setAporteAberto] = useState(false);

  const percentual = (Number(m.valor_atual) / Number(m.valor_alvo)) * 100;
  const concluida = percentual >= 100;
  const faltam = Math.max(0, Number(m.valor_alvo) - Number(m.valor_atual));

  const [state, formAction] = useFormState<MetaFormState, FormData>(async (_state, formData) => {
    const resultado = await registrarAporteMeta(m.id, {}, formData);
    if (!resultado.error) setAporteAberto(false);
    return resultado;
  }, {});

  // quanto guardar por mês para chegar na data
  let porMes: number | null = null;
  let mesesRestantes: number | null = null;
  if (m.data_alvo && !concluida) {
    const hoje = new Date();
    const alvo = new Date(`${m.data_alvo}T00:00:00`);
    mesesRestantes = (alvo.getFullYear() - hoje.getFullYear()) * 12 + (alvo.getMonth() - hoje.getMonth());
    porMes = mesesRestantes > 0 ? faltam / mesesRestantes : null;
  }
  const atrasada = mesesRestantes !== null && mesesRestantes < 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="relative h-28 w-full overflow-hidden">
        {m.imagem_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.imagem_url} alt={m.nome} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-400 text-4xl" aria-hidden>
            {concluida ? '🏆' : '🎯'}
          </div>
        )}
        <span
          className={cn(
            'absolute left-3 top-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold shadow-soft',
            concluida ? 'bg-emerald-500 text-white' : atrasada ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-800'
          )}
        >
          {concluida ? 'Concluída' : atrasada ? 'Prazo vencido' : 'Ativa'}
        </span>
        <div className="absolute right-2 top-2 flex gap-1 rounded-xl bg-white/90 p-0.5 opacity-0 shadow-soft transition group-hover:opacity-100 focus-within:opacity-100">
          <button type="button" onClick={onEditar} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Editar">
            <IconEdit className="h-4 w-4" />
          </button>
          <DeleteButton action={() => excluirMeta(m.id)} confirmMessage="Excluir esta meta?" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-gray-900">{m.nome}</p>
            {m.descricao && <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{m.descricao}</p>}
          </div>
          <Anel pct={Math.min(100, percentual)} tamanho={56} espessura={6} cor={concluida ? '#059669' : '#6366f1'} fundo="#eef0f4">
            <span className="text-[11px] font-bold tabular-nums text-gray-800">{Math.round(percentual)}%</span>
          </Anel>
        </div>

        <div className="mt-3">
          <ProgressBar percentual={percentual} tom={concluida ? 'positive' : 'brand'} />
          <div className="mt-1.5 flex items-baseline justify-between text-sm">
            <span className="font-bold tabular-nums text-gray-900">{formatCurrency(Number(m.valor_atual))}</span>
            <span className="text-xs text-gray-400">de {formatCurrency(Number(m.valor_alvo))}</span>
          </div>
          <p className={cn('mt-0.5 text-xs', concluida ? 'font-semibold text-emerald-600' : 'text-gray-500')}>
            {concluida ? 'Meta atingida! 🎉' : `Faltam ${formatCurrency(faltam)}`}
          </p>
        </div>

        {m.data_alvo && (
          <div className={cn('mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs', atrasada ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-800')}>
            <IconCalendario className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1">
              Prazo: <b>{formatDate(m.data_alvo)}</b>
              {porMes !== null && (
                <span className="block text-[11px] opacity-80">
                  guardar {formatCurrency(porMes)}/mês por {mesesRestantes} {mesesRestantes === 1 ? 'mês' : 'meses'}
                </span>
              )}
            </span>
          </div>
        )}

        {!concluida && (
          <div className="mt-auto pt-4">
            {aporteAberto ? (
              <form action={formAction} className="flex gap-2">
                <input name="valor_aporte" type="number" step="0.01" min="0.01" required autoFocus className="input-field flex-1" placeholder="Valor do aporte" />
                <BotaoOk />
                <button type="button" className="btn-secondary px-3" onClick={() => setAporteAberto(false)} aria-label="Cancelar">
                  ✕
                </button>
              </form>
            ) : (
              <button type="button" onClick={() => setAporteAberto(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-50 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100">
                <IconPlus className="h-4 w-4" /> Registrar aporte
              </button>
            )}
            {state.error && <p className="mt-1 text-xs text-negative">{state.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
