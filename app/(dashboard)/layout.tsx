import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';
import { provisionarPerfil } from '@/lib/auth-provisioning';
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

  let { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).maybeSingle();

  if (!perfil) {
    const meta = user.user_metadata as {
      nome?: string;
      telefone?: string;
      modo?: 'criar' | 'entrar';
      codigo_familia?: string;
    };
    await provisionarPerfil(supabase, user.id, {
      nome: meta.nome || user.email || 'Usuário',
      telefone: meta.telefone,
      modo: meta.modo || 'criar',
      codigoFamilia: meta.codigo_familia,
    });
    ({ data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).maybeSingle());
  }

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
