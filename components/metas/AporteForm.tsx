'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { MetaFormState } from '@/app/(dashboard)/metas/actions';

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Registrando...' : 'Registrar aporte'}
    </button>
  );
}

export function AporteForm({
  action,
  onSucesso,
}: {
  action: (state: MetaFormState, formData: FormData) => Promise<MetaFormState>;
  onSucesso: () => void;
}) {
  const [state, formAction] = useFormState(async (state: MetaFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label-field" htmlFor="valor_aporte">Valor do aporte</label>
        <input
          id="valor_aporte"
          name="valor_aporte"
          type="number"
          step="0.01"
          min="0.01"
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
