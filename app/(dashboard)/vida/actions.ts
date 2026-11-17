'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';
import type { VidaMensagem } from '@/types/database';

async function usuario() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export interface DadosAvaliacao {
  mes: string;
  pilar: number;
  nota: number | null;
  situacao: string | null;
  problema: string | null;
  objetivo: string | null;
  proxima_acao: string | null;
  indicador: string | null;
}

export async function salvarAvaliacao(d: DadosAvaliacao): Promise<{ error?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  if (d.pilar < 1 || d.pilar > 10) return { error: 'Pilar inválido.' };
  if (d.nota != null && (d.nota < 0 || d.nota > 10)) return { error: 'A nota vai de 0 a 10.' };
  const t = (v: string | null) => (v && v.trim() ? v.trim() : null);
  const { error } = await supabase.from('vida_avaliacoes').upsert(
    {
      mes: d.mes,
      pilar: d.pilar,
      nota: d.nota,
      situacao: t(d.situacao),
      problema: t(d.problema),
      objetivo: t(d.objetivo),
      proxima_acao: t(d.proxima_acao),
      indicador: t(d.indicador),
      origem: 'manual',
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'user_id,mes,pilar' }
  );
  if (error) return { error: error.message };
  revalidatePath('/vida');
  return {};
}

export async function salvarContexto(texto: string): Promise<{ error?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  const { error } = await supabase
    .from('vida_contexto')
    .upsert({ user_id: user.id, texto, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return { error: error.message };
  revalidatePath('/vida/ajustes');
  return {};
}

export async function carregarMensagens(conversaId: string): Promise<{ error?: string; mensagens?: Pick<VidaMensagem, 'id' | 'papel' | 'conteudo' | 'criado_em'>[] }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  const { data, error } = await supabase
    .from('vida_mensagens')
    .select('id, papel, conteudo, criado_em')
    .eq('conversa_id', conversaId)
    .order('criado_em', { ascending: true });
  if (error) return { error: error.message };
  return { mensagens: data ?? [] };
}

export async function renomearConversa(id: string, titulo: string): Promise<{ error?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  const t = titulo.trim().slice(0, 120);
  if (!t) return { error: 'Dê um nome à conversa.' };
  const { error } = await supabase.from('vida_conversas').update({ titulo: t }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/vida/conversas');
  return {};
}

export async function excluirConversa(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  const { error } = await supabase.from('vida_conversas').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/vida/conversas');
  revalidatePath('/vida');
  return {};
}
