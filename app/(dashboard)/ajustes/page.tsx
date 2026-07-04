import { createServerSupabase } from '@/lib/supabase-server';
import { PerfilForm } from '@/components/ajustes/PerfilForm';
import { AlertasForm } from '@/components/ajustes/AlertasForm';
import { CodigoFamilia } from '@/components/ajustes/CodigoFamilia';
import { TemaSwitcher } from '@/components/ajustes/TemaSwitcher';

export default async function AjustesPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: perfil }, { data: alertas }] = await Promise.all([
    supabase.from('perfis').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('alertas_config').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  if (!perfil) {
    return (
      <div className="card p-6 text-sm text-gray-500">
        Não foi possível carregar seu perfil agora. Tente recarregar a página em alguns instantes.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <PerfilForm perfil={perfil} email={user.email ?? ''} />
        {perfil.familia_id && <CodigoFamilia codigo={perfil.familia_id} />}
        <TemaSwitcher />
      </div>
      <AlertasForm config={alertas} />
    </div>
  );
}
