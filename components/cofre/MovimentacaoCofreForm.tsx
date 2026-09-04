'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { cn, formatCurrency } from '@/lib/utils';
import type { CofreFormState } from '@/app/(dashboard)/cofre/actions';
import type { TipoMovimentacaoCofre } from '@/types/database';

function BotaoRegistrar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Registrando...' : 'Registrar'}
    </button>
  );
}

export function MovimentacaoCofreForm({
  action,
  saldoAtual,
  tipoInicial = 'deposito',
  onSucesso,
  onCancelar,
}: {
  action: (state: CofreFormState, formData: FormData) => Promise<CofreFormState>;
  saldoAtual: number;
  tipoInicial?: TipoMovimentacaoCofre;
  onSucesso: () => void;
  onCancelar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoMovimentacaoCofre>(tipoInicial);

  const [state, formAction] = useFormState(async (state: CofreFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tipo" value={tipo} />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTipo('deposito')}
          className={cn(
            'rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
            tipo === 'deposito'
              ? 'border-positive bg-positive/10 text-positive'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          )}
        >
          Depositar
        </button>
        <button
          type="button"
          onClick={() => setTipo('retirada')}
          className={cn(
            'rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
            tipo === 'retirada'
              ? 'border-negative bg-negative/10 text-negative'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          )}
        >
          Retirar
        </button>
      </div>

      <div>
        <label className="label-field" htmlFor="valor">Valor *</label>
        <input
          id="valor"
          name="valor"
          type="number"
          step="0.01"
          min="0.01"
          max={tipo === 'retirada' ? saldoAtual : undefined}
          required
          autoFocus
          className="input-field"
          placeholder="0,00"
        />
        <p className="mt-1 text-xs text-gray-400">Saldo atual no cofre: {formatCurrency(saldoAtual)}</p>
      </div>

      <div>
        <label className="label-field" htmlFor="data">Data *</label>
        <input
          id="data"
          name="data"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="input-field"
        />
      </div>

      <div>
        <label className="label-field" htmlFor="descricao">Descrição</label>
        <input
          id="descricao"
          name="descricao"
          type="text"
          className="input-field"
          placeholder="Ex: Aporte mensal (opcional)"
        />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancelar} className="btn-secondary">
          Cancelar
        </button>
        <BotaoRegistrar />
      </div>
    </form>
  );
}
