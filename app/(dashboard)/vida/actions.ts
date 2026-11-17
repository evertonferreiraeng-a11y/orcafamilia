'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';
import type { VidaMensagem } from '@/types/database';
import { normalizarProposta, type PropostaPlano } from '@/lib/vida/planos';
import { carregarFinancas, valorDaFonte } from '@/lib/vida/financas';

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

/* ================= PLANOS ================= */


export async function salvarPlano(proposta: PropostaPlano, origem: 'ia' | 'manual' | 'dividas' = 'ia'): Promise<{ error?: string; id?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  const p = normalizarProposta(proposta);
  if (!p) return { error: 'Plano inválido.' };

  const { data: plano, error } = await supabase
    .from('vida_planos')
    .insert({ titulo: p.titulo, pilar: p.pilar, objetivo: p.objetivo, resumo: p.resumo, prazo: p.prazo, origem })
    .select('id')
    .single();
  if (error || !plano) return { error: error?.message ?? 'Não foi possível salvar o plano.' };

  if (p.etapas.length) {
    const { error: e } = await supabase
      .from('vida_etapas')
      .insert(p.etapas.map((et, i) => ({ plano_id: plano.id, ordem: i, titulo: et.titulo, detalhe: et.detalhe, prazo: et.prazo })));
    if (e) return { error: e.message };
  }

  if (p.indicadores.length) {
    const temAuto = p.indicadores.some((i) => i.fonte !== 'manual');
    const fin = temAuto ? await carregarFinancas(supabase, user.id).catch(() => null) : null;
    const { data: inds, error: e } = await supabase
      .from('vida_indicadores')
      .insert(
        p.indicadores.map((ind, i) => ({
          plano_id: plano.id,
          ordem: i,
          nome: ind.nome,
          unidade: ind.unidade,
          meta: ind.meta,
          direcao: ind.direcao,
          fonte: ind.fonte,
          inicial: ind.fonte !== 'manual' && fin ? valorDaFonte(fin, ind.fonte) : ind.inicial,
        }))
      )
      .select('id, inicial');
    if (e) return { error: e.message };
    const regs = (inds ?? []).filter((i) => i.inicial != null).map((i) => ({ indicador_id: i.id, valor: Number(i.inicial) }));
    if (regs.length) await supabase.from('vida_registros').upsert(regs, { onConflict: 'indicador_id,data' });
  }

  revalidatePath('/vida/planos');
  revalidatePath('/vida');
  return { id: plano.id };
}

export async function alternarEtapa(id: string, feita: boolean): Promise<{ error?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  const { error } = await supabase.from('vida_etapas').update({ feita, feita_em: feita ? new Date().toISOString() : null }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/vida/planos');
  return {};
}

export async function adicionarEtapa(planoId: string, titulo: string, prazo: string | null): Promise<{ error?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  const t = titulo.trim();
  if (!t) return { error: 'Escreva a etapa.' };
  const { count } = await supabase.from('vida_etapas').select('id', { count: 'exact', head: true }).eq('plano_id', planoId);
  const { error } = await supabase.from('vida_etapas').insert({ plano_id: planoId, titulo: t.slice(0, 200), prazo: prazo || null, ordem: count ?? 0 });
  if (error) return { error: error.message };
  revalidatePath('/vida/planos');
  return {};
}

export async function excluirEtapa(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  const { error } = await supabase.from('vida_etapas').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/vida/planos');
  return {};
}

export async function registrarValor(indicadorId: string, valor: number, data?: string): Promise<{ error?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  if (!Number.isFinite(valor)) return { error: 'Valor inválido.' };
  const registro = data ? { indicador_id: indicadorId, valor, data } : { indicador_id: indicadorId, valor };
  const { error } = await supabase.from('vida_registros').upsert(registro, { onConflict: 'indicador_id,data' });
  if (error) return { error: error.message };
  revalidatePath('/vida/planos');
  return {};
}

export async function mudarStatusPlano(id: string, status: 'ativo' | 'pausado' | 'concluido'): Promise<{ error?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  const { error } = await supabase.from('vida_planos').update({ status, atualizado_em: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/vida/planos');
  revalidatePath('/vida');
  return {};
}

export async function excluirPlano(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  const { error } = await supabase.from('vida_planos').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/vida/planos');
  revalidatePath('/vida');
  return {};
}

export async function salvarParamsDivida(dividaId: string, taxa: number | null, parcela: number | null): Promise<{ error?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { error: 'Sessão expirada.' };
  if (taxa != null && (taxa < 0 || taxa > 100)) return { error: 'Taxa inválida.' };
  if (parcela != null && parcela < 0) return { error: 'Parcela inválida.' };
  const { error } = await supabase
    .from('vida_dividas_params')
    .upsert({ divida_id: dividaId, user_id: user.id, taxa_mensal: taxa, parcela, atualizado_em: new Date().toISOString() }, { onConflict: 'divida_id' });
  if (error) return { error: error.message };
  return {};
}
