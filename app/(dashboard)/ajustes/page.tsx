import { createServerSupabase } from '@/lib/supabase-server';
import { PerfilForm } from '@/components/ajustes/PerfilForm';
import { AlertasForm } from '@/components/ajustes/AlertasForm';
import { CodigoFamilia } from '@/components/ajustes/CodigoFamilia';
import { TemaSwitcher } from '@/components/ajustes/TemaSwitcher';
import { IconAjustes } from '@/components/icons';

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
      <div className="card p-5 text-sm text-gray-500">
        Não foi possível carregar seu perfil agora. Tente recarregar a página em alguns instantes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <IconAjustes className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
          <p className="mt-1 text-sm text-gray-500">Gerencie seu perfil, família e preferências</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <PerfilForm perfil={perfil} email={user.email ?? ''} />
          {perfil.familia_id && <CodigoFamilia codigo={perfil.familia_id} />}
          <TemaSwitcher />
        </div>
        <AlertasForm config={alertas} />
      </div>
    </div>
  );
}
