import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MonthPicker } from '@/components/MonthPicker';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).maybeSingle();

  const { data: notificacoes } = await supabase
    .from('notificacoes_log')
    .select('*')
    .eq('user_id', user.id)
    .order('enviado_em', { ascending: false })
    .limit(10);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          nome={perfil?.nome ?? user.email ?? 'Usuário'}
          email={user.email ?? ''}
          notificacoes={notificacoes ?? []}
          titulo="OrçaFamília"
        >
          <Suspense fallback={null}>
            <MonthPicker />
          </Suspense>
        </Topbar>
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
