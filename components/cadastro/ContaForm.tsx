'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { Conta } from '@/types/database';
import type { CadastroFormState } from '@/app/(dashboard)/cadastro/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

export function ContaForm({
  action,
  conta,
  onSucesso,
}: {
  action: (state: CadastroFormState, formData: FormData) => Promise<CadastroFormState>;
  conta?: Conta;
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
        <input id="nome" name="nome" type="text" required defaultValue={conta?.nome} className="input-field" placeholder="Ex: Nubank" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" defaultValue={conta?.tipo ?? 'corrente'} className="input-field">
            <option value="corrente">Corrente</option>
            <option value="poupanca">Poupança</option>
            <option value="investimento">Investimento</option>
            <option value="dinheiro">Dinheiro</option>
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor="saldo_inicial">Saldo inicial</label>
          <input
            id="saldo_inicial"
            name="saldo_inicial"
            type="number"
            step="0.01"
            defaultValue={conta?.saldo_inicial ?? 0}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor="cor">Cor</label>
        <input id="cor" name="cor" type="color" defaultValue={conta?.cor ?? '#2a78d6'} className="h-10 w-16 rounded-lg border border-gray-200" />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label={conta ? 'Salvar alterações' : 'Cadastrar conta'} />
      </div>
    </form>
  );
}
