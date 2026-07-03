'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { signUp, type CadastroState } from './actions';

const initialState: CadastroState = {};

function BotaoCriar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? 'Criando conta...' : 'Criar conta'}
    </button>
  );
}

export default function CadastroPage() {
  const [state, formAction] = useFormState(signUp, initialState);
  const [modo, setModo] = useState<'criar' | 'entrar'>('criar');

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Criar conta</h2>

      <div>
        <label className="label-field" htmlFor="nome">Nome</label>
        <input id="nome" name="nome" type="text" required className="input-field" placeholder="Seu nome" />
      </div>

      <div>
        <label className="label-field" htmlFor="telefone">Telefone (WhatsApp)</label>
        <input id="telefone" name="telefone" type="tel" className="input-field" placeholder="+5511999999999" />
      </div>

      <div>
        <label className="label-field" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required className="input-field" placeholder="voce@exemplo.com" />
      </div>

      <div>
        <label className="label-field" htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" required minLength={6} className="input-field" placeholder="Mínimo 6 caracteres" />
      </div>

      <div>
        <label className="label-field">Família</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModo('criar')}
            className={modo === 'criar' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
          >
            Criar nova família
          </button>
          <button
            type="button"
            onClick={() => setModo('entrar')}
            className={modo === 'entrar' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
          >
            Entrar em família
          </button>
        </div>
        <input type="hidden" name="modo" value={modo} />
      </div>

      {modo === 'entrar' && (
        <div>
          <label className="label-field" htmlFor="codigo_familia">Código da família</label>
          <input
            id="codigo_familia"
            name="codigo_familia"
            type="text"
            required
            className="input-field"
            placeholder="Código compartilhado pelo seu cônjuge"
          />
        </div>
      )}

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.mensagem && <p className="text-sm text-positive">{state.mensagem}</p>}

      <BotaoCriar />

      <p className="text-center text-sm text-gray-500">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
