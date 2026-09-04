'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { CofreSeguro } from '@/components/cofre/types';
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
  cofre?: CofreSeguro;
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

      <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
        {cofre?.protegido && (
          <div>
            <label className="label-field" htmlFor="senha_atual">Senha atual</label>
            <input
              id="senha_atual"
              name="senha_atual"
              type="password"
              autoComplete="current-password"
              className="input-field"
              placeholder="Necessária para trocar ou remover a senha"
            />
          </div>
        )}
        <div>
          <label className="label-field" htmlFor="senha">
            {cofre?.protegido ? 'Nova senha' : 'Senha de acesso (opcional)'}
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            className="input-field"
            placeholder={cofre?.protegido ? 'Deixe em branco para manter a atual' : 'Proteja este cofre com uma senha'}
          />
        </div>
        {cofre?.protegido && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              name="remover_senha"
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Remover proteção por senha
          </label>
        )}
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label={cofre ? 'Salvar alterações' : 'Criar cofre'} />
      </div>
    </form>
  );
}
