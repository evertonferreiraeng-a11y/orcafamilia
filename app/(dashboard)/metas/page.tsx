import { createServerSupabase } from '@/lib/supabase-server';
import { MetasClient } from '@/components/metas/MetasClient';

export default async function MetasPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: metas } = await supabase
    .from('metas')
    .select('*')
    .eq('user_id', user.id)
    .order('criado_em', { ascending: false });

  return <MetasClient metas={metas ?? []} />;
}
