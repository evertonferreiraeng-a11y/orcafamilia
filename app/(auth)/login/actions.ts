'use server';

import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';

export interface AuthState {
  error?: string;
}

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim();
  const senha = String(formData.get('senha') || '');

  if (!email || !senha) {
    return { error: 'Informe e-mail e senha.' };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    return { error: 'E-mail ou senha inválidos.' };
  }

  redirect('/dashboard');
}
