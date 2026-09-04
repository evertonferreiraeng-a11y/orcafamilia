import { createServerSupabase } from '@/lib/supabase-server';
import { CofreClient } from '@/components/cofre/CofreClient';

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

  return <CofreClient cofres={cofres ?? []} movimentacoes={movimentacoes ?? []} />;
}
