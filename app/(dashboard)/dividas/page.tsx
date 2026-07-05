import { createServerSupabase } from '@/lib/supabase-server';
import { DividasClient } from '@/components/dividas/DividasClient';

export default async function DividasPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: dividas }, { data: categorias }, { data: contas }] = await Promise.all([
    supabase.from('dividas').select('*').eq('user_id', user.id).order('data_vencimento', { ascending: true }),
    supabase.from('categorias').select('*').eq('user_id', user.id).eq('tipo', 'despesa').order('nome'),
    supabase.from('contas').select('*').eq('user_id', user.id).eq('ativa', true).order('nome'),
  ]);

  return <DividasClient dividas={dividas ?? []} categorias={categorias ?? []} contas={contas ?? []} />;
}
