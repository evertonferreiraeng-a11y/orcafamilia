'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { IconEdit, IconMetas, IconCalendario } from '@/components/icons';
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

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-100 bg-brand-50">
      {m.imagem_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.imagem_url} alt={m.nome} className="h-32 w-full object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
              concluida ? 'bg-positive/10 text-positive' : 'bg-brand-100 text-brand-700'
            )}
          >
            {concluida ? 'Concluída' : 'Ativa'}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onEditar}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/60 hover:text-gray-700"
              aria-label="Editar"
            >
              <IconEdit className="h-4 w-4" />
            </button>
            <DeleteButton action={() => excluirMeta(m.id)} confirmMessage="Excluir esta meta?" />
          </div>
        </div>

        <p className="mt-3 font-bold text-gray-900">{m.nome}</p>
        {m.descricao && <p className="mt-0.5 text-sm text-gray-500">{m.descricao}</p>}

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>Progresso</span>
            <span className="font-semibold text-gray-700">{percentual.toFixed(1)}%</span>
          </div>
          <ProgressBar percentual={percentual} tom="brand" />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-bold text-gray-900">{formatCurrency(Number(m.valor_atual))}</span>
          <span className="text-gray-400">de {formatCurrency(Number(m.valor_alvo))}</span>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          {concluida ? 'Meta atingida!' : `Faltam ${formatCurrency(faltam)}`}
        </p>

        {m.data_alvo && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-100 px-2.5 py-1.5 text-xs font-medium text-brand-700">
            <IconCalendario className="h-3.5 w-3.5" />
            Meta: {formatDate(m.data_alvo)}
          </p>
        )}

        {!concluida && (
          <div className="mt-4">
            {aporteAberto ? (
              <form action={formAction} className="flex gap-2">
                <input
                  name="valor_aporte"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  className="input-field flex-1"
                  placeholder="0,00"
                />
                <BotaoOk />
              </form>
            ) : (
              <button type="button" onClick={() => setAporteAberto(true)} className="btn-secondary w-full">
                <IconMetas className="h-4 w-4" />
                Atualizar
              </button>
            )}
            {state.error && <p className="mt-1 text-xs text-negative">{state.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
