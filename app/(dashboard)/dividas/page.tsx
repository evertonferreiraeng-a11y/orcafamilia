import { createServerSupabase } from '@/lib/supabase-server';
import { DividasClient } from '@/components/dividas/DividasClient';

export default async function DividasPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: dividas } = await supabase
    .from('dividas')
    .select('*')
    .eq('user_id', user.id)
    .order('data_vencimento', { ascending: true });

  return <DividasClient dividas={dividas ?? []} />;
}
