import { createServerSupabase } from '@/lib/supabase-server';
import { CadastroTabs } from '@/components/cadastro/CadastroTabs';

export default async function CadastroPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: contas }, { data: cartoes }, { data: categorias }, { data: subcategorias }, { data: investimentos }] =
    await Promise.all([
      supabase.from('contas').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('cartoes').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('categorias').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('subcategorias').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('investimentos').select('*').eq('user_id', user.id).order('criado_em', { ascending: false }),
    ]);

  return (
    <CadastroTabs
      contas={contas ?? []}
      cartoes={cartoes ?? []}
      categorias={categorias ?? []}
      subcategorias={subcategorias ?? []}
      investimentos={investimentos ?? []}
    />
  );
}
