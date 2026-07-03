'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';

export interface AjustesFormState {
  error?: string;
  sucesso?: boolean;
}

export async function atualizarPerfil(_prevState: AjustesFormState, formData: FormData): Promise<AjustesFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const nome = String(formData.get('nome') || '').trim();
  const telefone = String(formData.get('telefone') || '').trim() || null;

  if (!nome) return { error: 'Informe seu nome.' };

  const { error } = await supabase.from('perfis').update({ nome, telefone }).eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/ajustes');
  return { sucesso: true };
}

export async function atualizarAlertas(_prevState: AjustesFormState, formData: FormData): Promise<AjustesFormState> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const dados = {
    user_id: user.id,
    telefone: String(formData.get('telefone') || '').trim() || null,
    alerta_saldo_ativo: formData.get('alerta_saldo_ativo') === 'on',
    alerta_saldo_limite: formData.get('alerta_saldo_limite') ? Number(formData.get('alerta_saldo_limite')) : null,
    alerta_divida_ativo: formData.get('alerta_divida_ativo') === 'on',
    alerta_divida_dias_antes: Number(formData.get('alerta_divida_dias_antes') || 3),
    alerta_orcamento_ativo: formData.get('alerta_orcamento_ativo') === 'on',
    alerta_orcamento_percentual: Number(formData.get('alerta_orcamento_percentual') || 90),
  };

  const { error } = await supabase.from('alertas_config').upsert(dados);
  if (error) return { error: error.message };

  revalidatePath('/ajustes');
  return { sucesso: true };
}
