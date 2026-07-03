'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { Categoria } from '@/types/database';
import type { OrcamentoFormState } from '@/app/(dashboard)/orcamentos/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

export function OrcamentoForm({
  action,
  categorias,
  mesReferencia,
  valorLimiteAtual,
  categoriaFixa,
  onSucesso,
}: {
  action: (state: OrcamentoFormState, formData: FormData) => Promise<OrcamentoFormState>;
  categorias: Categoria[];
  mesReferencia: string;
  valorLimiteAtual?: number;
  categoriaFixa?: { id: string; nome: string };
  onSucesso: () => void;
}) {
  const [state, formAction] = useFormState(async (state: OrcamentoFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="mes_referencia" value={mesReferencia} />

      <div>
        <label className="label-field">Categoria</label>
        {categoriaFixa ? (
          <>
            <input type="hidden" name="categoria_id" value={categoriaFixa.id} />
            <p className="input-field bg-gray-50 text-gray-600">{categoriaFixa.nome}</p>
          </>
        ) : (
          <select name="categoria_id" required className="input-field">
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="label-field" htmlFor="valor_limite">Valor limite mensal</label>
        <input
          id="valor_limite"
          name="valor_limite"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={valorLimiteAtual}
          className="input-field"
          placeholder="0,00"
        />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label="Salvar orçamento" />
      </div>
    </form>
  );
}
