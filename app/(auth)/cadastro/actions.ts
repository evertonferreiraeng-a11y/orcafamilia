'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase-server';
import { provisionarPerfil } from '@/lib/auth-provisioning';

export interface CadastroState {
  error?: string;
  mensagem?: string;
}

export async function signUp(_prevState: CadastroState, formData: FormData): Promise<CadastroState> {
  const nome = String(formData.get('nome') || '').trim();
  const telefone = String(formData.get('telefone') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const senha = String(formData.get('senha') || '');
  const modo = String(formData.get('modo') || 'criar') as 'criar' | 'entrar';
  const codigoFamilia = String(formData.get('codigo_familia') || '').trim();

  if (!nome || !email || !senha) {
    return { error: 'Preencha nome, e-mail e senha.' };
  }

  if (modo === 'entrar' && !codigoFamilia) {
    return { error: 'Informe o código da família para entrar.' };
  }

  const origin = headers().get('origin');
  const supabase = createServerSupabase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        nome,
        telefone,
        modo,
        codigo_familia: modo === 'entrar' ? codigoFamilia : null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Não foi possível criar a conta.' };
  }

  if (!data.session) {
    return { mensagem: 'Conta criada! Verifique seu e-mail para confirmar o acesso.' };
  }

  const resultado = await provisionarPerfil(supabase, data.user.id, {
    nome,
    telefone,
    modo,
    codigoFamilia,
  });

  if (resultado.error) {
    return { error: resultado.error };
  }

  redirect('/dashboard');
}
