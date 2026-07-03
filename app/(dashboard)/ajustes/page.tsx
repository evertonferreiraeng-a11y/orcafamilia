import { createServerSupabase } from '@/lib/supabase-server';
import { PerfilForm } from '@/components/ajustes/PerfilForm';
import { AlertasForm } from '@/components/ajustes/AlertasForm';
import { CodigoFamilia } from '@/components/ajustes/CodigoFamilia';

export default async function AjustesPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: perfil }, { data: alertas }] = await Promise.all([
    supabase.from('perfis').select('*').eq('id', user.id).single(),
    supabase.from('alertas_config').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  if (!perfil) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <PerfilForm perfil={perfil} email={user.email ?? ''} />
        {perfil.familia_id && <CodigoFamilia codigo={perfil.familia_id} />}
      </div>
      <AlertasForm config={alertas} />
    </div>
  );
}
