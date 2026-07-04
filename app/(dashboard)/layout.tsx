import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';
import { DashboardShell } from '@/components/layout/DashboardShell';
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
    <DashboardShell
      nome={perfil?.nome || 'Usuário'}
      email={user.email ?? ''}
      notificacoes={notificacoes ?? []}
      topbarSlot={
        <Suspense fallback={null}>
          <MonthPicker />
        </Suspense>
      }
    >
      {children}
    </DashboardShell>
  );
}
