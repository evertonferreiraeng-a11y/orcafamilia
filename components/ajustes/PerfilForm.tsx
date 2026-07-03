'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { atualizarPerfil, type AjustesFormState } from '@/app/(dashboard)/ajustes/actions';
import type { Perfil } from '@/types/database';

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar perfil'}
    </button>
  );
}

export function PerfilForm({ perfil, email }: { perfil: Perfil; email: string }) {
  const [state, formAction] = useFormState<AjustesFormState, FormData>(atualizarPerfil, {});

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <h2 className="text-sm font-semibold text-gray-700">Meu perfil</h2>

      <div>
        <label className="label-field">E-mail</label>
        <p className="input-field bg-gray-50 text-gray-500">{email}</p>
      </div>

      <div>
        <label className="label-field" htmlFor="nome">Nome</label>
        <input id="nome" name="nome" type="text" required defaultValue={perfil.nome} className="input-field" />
      </div>

      <div>
        <label className="label-field" htmlFor="telefone">Telefone</label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          defaultValue={perfil.telefone ?? ''}
          className="input-field"
          placeholder="+5511999999999"
        />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.sucesso && <p className="text-sm text-positive">Perfil atualizado.</p>}

      <BotaoSalvar />
    </form>
  );
}
