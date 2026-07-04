'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { Subcategoria } from '@/types/database';
import type { CadastroFormState } from '@/app/(dashboard)/cadastro/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

export function SubcategoriaForm({
  action,
  categoriaId,
  subcategoria,
  onSucesso,
}: {
  action: (state: CadastroFormState, formData: FormData) => Promise<CadastroFormState>;
  categoriaId: string;
  subcategoria?: Subcategoria;
  onSucesso: () => void;
}) {
  const [state, formAction] = useFormState(async (state: CadastroFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="categoria_id" value={categoriaId} />
      <div>
        <label className="label-field" htmlFor="nome">Nome</label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          defaultValue={subcategoria?.nome}
          className="input-field"
          placeholder="Ex: Supermercado"
        />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label={subcategoria ? 'Salvar alterações' : 'Cadastrar subcategoria'} />
      </div>
    </form>
  );
}
