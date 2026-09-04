import { createServerSupabase } from '@/lib/supabase-server';
import { CofreClient } from '@/components/cofre/CofreClient';
import type { CofreSeguro } from '@/components/cofre/types';

export default async function CofrePage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: cofres }, { data: movimentacoes }] = await Promise.all([
    supabase.from('cofres').select('*').eq('user_id', user.id).order('criado_em', { ascending: false }),
    supabase
      .from('cofre_movimentacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false }),
  ]);

  // Nunca envia o hash da senha para o cliente — só a informação de que existe proteção.
  const cofresSeguros: CofreSeguro[] = (cofres ?? []).map(({ senha_hash, ...resto }) => ({
    ...resto,
    protegido: !!senha_hash,
  }));

  return <CofreClient cofres={cofresSeguros} movimentacoes={movimentacoes ?? []} />;
}
