'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { Investimento } from '@/types/database';
import type { CadastroFormState } from '@/app/(dashboard)/cadastro/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

export function InvestimentoForm({
  action,
  investimento,
  onSucesso,
}: {
  action: (state: CadastroFormState, formData: FormData) => Promise<CadastroFormState>;
  investimento?: Investimento;
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
        <input id="nome" name="nome" type="text" required defaultValue={investimento?.nome} className="input-field" placeholder="Ex: Tesouro Selic" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" defaultValue={investimento?.tipo ?? 'renda_fixa'} className="input-field">
            <option value="renda_fixa">Renda fixa</option>
            <option value="renda_variavel">Renda variável</option>
            <option value="fundo">Fundo</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor="instituicao">Instituição</label>
          <input id="instituicao" name="instituicao" type="text" defaultValue={investimento?.instituicao ?? ''} className="input-field" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="valor_investido">Valor investido</label>
          <input
            id="valor_investido"
            name="valor_investido"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={investimento?.valor_investido}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="valor_atual">Valor atual</label>
          <input
            id="valor_atual"
            name="valor_atual"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={investimento?.valor_atual}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor="data_aplicacao">Data de aplicação</label>
        <input id="data_aplicacao" name="data_aplicacao" type="date" defaultValue={investimento?.data_aplicacao ?? ''} className="input-field" />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label={investimento ? 'Salvar alterações' : 'Cadastrar investimento'} />
      </div>
    </form>
  );
}
