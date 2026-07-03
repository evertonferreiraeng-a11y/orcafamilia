'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { DividaFormState } from '@/app/(dashboard)/dividas/actions';
import { formatCurrency } from '@/lib/utils';

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Registrando...' : 'Registrar pagamento'}
    </button>
  );
}

export function PagamentoForm({
  action,
  saldoDevedor,
  onSucesso,
}: {
  action: (state: DividaFormState, formData: FormData) => Promise<DividaFormState>;
  saldoDevedor: number;
  onSucesso: () => void;
}) {
  const [state, formAction] = useFormState(async (state: DividaFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-gray-500">Saldo devedor atual: <span className="font-medium text-gray-800">{formatCurrency(saldoDevedor)}</span></p>

      <div>
        <label className="label-field" htmlFor="valor_pagamento">Valor do pagamento</label>
        <input
          id="valor_pagamento"
          name="valor_pagamento"
          type="number"
          step="0.01"
          min="0.01"
          max={saldoDevedor}
          required
          className="input-field"
          placeholder="0,00"
        />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar />
      </div>
    </form>
  );
}
