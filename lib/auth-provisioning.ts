import type { createServerSupabase } from '@/lib/supabase-server';

type SupabaseClient = ReturnType<typeof createServerSupabase>;

export interface DadosProvisionamento {
  nome: string;
  telefone?: string | null;
  modo: 'criar' | 'entrar';
  codigoFamilia?: string | null;
}

/**
 * Cria o perfil, a família (ou vincula a uma existente) e o vínculo em
 * familia_membros para um usuário recém-autenticado. Idempotente: se o
 * perfil já existir, não faz nada.
 */
export async function provisionarPerfil(
  supabase: SupabaseClient,
  userId: string,
  dados: DadosProvisionamento
): Promise<{ error?: string }> {
  const { data: perfilExistente } = await supabase
    .from('perfis')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (perfilExistente) {
    return {};
  }

  let familiaId: string;

  if (dados.modo === 'entrar') {
    if (!dados.codigoFamilia) {
      return { error: 'Informe o código da família para entrar.' };
    }

    const { data: familia } = await supabase
      .from('familias')
      .select('id')
      .eq('id', dados.codigoFamilia)
      .maybeSingle();

    if (!familia) {
      return { error: 'Código de família inválido.' };
    }

    familiaId = familia.id;
  } else {
    const { data: novaFamilia, error: erroFamilia } = await supabase
      .from('familias')
      .insert({ nome: `Família de ${dados.nome}` })
      .select('id')
      .single();

    if (erroFamilia || !novaFamilia) {
      return { error: erroFamilia?.message ?? 'Não foi possível criar a família.' };
    }

    familiaId = novaFamilia.id;
  }

  const { error: erroPerfil } = await supabase.from('perfis').insert({
    id: userId,
    nome: dados.nome,
    telefone: dados.telefone || null,
    familia_id: familiaId,
  });

  if (erroPerfil) {
    return { error: erroPerfil.message };
  }

  const { error: erroMembro } = await supabase.from('familia_membros').insert({
    familia_id: familiaId,
    user_id: userId,
  });

  if (erroMembro) {
    return { error: erroMembro.message };
  }

  await supabase.from('alertas_config').insert({ user_id: userId });

  return {};
}
