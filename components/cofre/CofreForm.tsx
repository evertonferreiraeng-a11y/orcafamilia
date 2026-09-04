'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { Cofre } from '@/types/database';
import type { CofreFormState } from '@/app/(dashboard)/cofre/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

export function CofreForm({
  action,
  cofre,
  onSucesso,
}: {
  action: (state: CofreFormState, formData: FormData) => Promise<CofreFormState>;
  cofre?: Cofre;
  onSucesso: () => void;
}) {
  const [state, formAction] = useFormState(async (state: CofreFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label-field" htmlFor="nome">Nome do cofre</label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          defaultValue={cofre?.nome}
          className="input-field"
          placeholder="Ex: Reforma da casa"
        />
      </div>

      <div>
        <label className="label-field" htmlFor="descricao">Descrição</label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          defaultValue={cofre?.descricao ?? ''}
          className="input-field"
          placeholder="Para que esse dinheiro está guardado (opcional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!cofre && (
          <div>
            <label className="label-field" htmlFor="saldo_inicial">Saldo inicial</label>
            <input
              id="saldo_inicial"
              name="saldo_inicial"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
              className="input-field"
              placeholder="0,00"
            />
          </div>
        )}
        <div>
          <label className="label-field" htmlFor="cor">Cor</label>
          <input
            id="cor"
            name="cor"
            type="color"
            defaultValue={cofre?.cor ?? '#2a78d6'}
            className="h-10 w-16 rounded-lg border border-gray-200"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label={cofre ? 'Salvar alterações' : 'Criar cofre'} />
      </div>
    </form>
  );
}
