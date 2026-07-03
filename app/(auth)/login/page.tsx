'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, type AuthState } from './actions';

const initialState: AuthState = {};

function BotaoEntrar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? 'Entrando...' : 'Entrar'}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Entrar na sua conta</h2>

      <div>
        <label className="label-field" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required className="input-field" placeholder="voce@exemplo.com" />
      </div>

      <div>
        <label className="label-field" htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" required className="input-field" placeholder="••••••••" />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <BotaoEntrar />

      <p className="text-center text-sm text-gray-500">
        Não tem conta?{' '}
        <Link href="/cadastro" className="font-medium text-brand-600 hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
