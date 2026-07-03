'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { Categoria } from '@/types/database';
import type { CadastroFormState } from '@/app/(dashboard)/cadastro/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

export function CategoriaForm({
  action,
  categoria,
  onSucesso,
}: {
  action: (state: CadastroFormState, formData: FormData) => Promise<CadastroFormState>;
  categoria?: Categoria;
  onSucesso: () => void;
}) {
  const [state, formAction] = useFormState(async (state: CadastroFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label-field" htmlFor="nome">Nome</label>
        <input id="nome" name="nome" type="text" required defaultValue={categoria?.nome} className="input-field" placeholder="Ex: Alimentação" />
      </div>

      <div>
        <label className="label-field" htmlFor="tipo">Tipo</label>
        <select id="tipo" name="tipo" defaultValue={categoria?.tipo ?? 'despesa'} className="input-field">
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
      </div>

      <div>
        <label className="label-field" htmlFor="cor">Cor</label>
        <input id="cor" name="cor" type="color" defaultValue={categoria?.cor ?? '#888888'} className="h-10 w-16 rounded-lg border border-gray-200" />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label={categoria ? 'Salvar alterações' : 'Cadastrar categoria'} />
      </div>
    </form>
  );
}
