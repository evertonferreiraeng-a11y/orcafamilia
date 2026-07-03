'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { Meta } from '@/types/database';
import type { MetaFormState } from '@/app/(dashboard)/metas/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

export function MetaForm({
  action,
  meta,
  onSucesso,
}: {
  action: (state: MetaFormState, formData: FormData) => Promise<MetaFormState>;
  meta?: Meta;
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
        <label className="label-field" htmlFor="nome">Nome da meta</label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          defaultValue={meta?.nome}
          className="input-field"
          placeholder="Ex: Viagem de férias"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="valor_alvo">Valor alvo</label>
          <input
            id="valor_alvo"
            name="valor_alvo"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={meta?.valor_alvo}
            className="input-field"
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="data_alvo">Data alvo</label>
          <input
            id="data_alvo"
            name="data_alvo"
            type="date"
            defaultValue={meta?.data_alvo ?? ''}
            className="input-field"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label={meta ? 'Salvar alterações' : 'Criar meta'} />
      </div>
    </form>
  );
}
