import { createServerSupabase } from '@/lib/supabase-server';
import { carregarCasa } from '@/lib/casa/carregar';
import { CasaProvider } from '@/components/casa/CasaContext';
import { ModaisCasa } from '@/components/casa/ModaisCasa';
import type { DadosCasa } from '@/lib/casa/calc';

export const dynamic = 'force-dynamic';

export default async function CasaLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let dados: DadosCasa;
  try {
    dados = await carregarCasa(supabase);
  } catch (e) {
    const msg = (e as Error).message;
    return (
      <div className="card mx-auto max-w-xl p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Não foi possível abrir o app Casa</h2>
        <p className="text-sm text-gray-600">
          {msg.includes('SEM_FAMILIA')
            ? 'Seu usuário ainda não está vinculado a uma família. Crie ou entre em uma família em Família.'
            : msg.includes('casa_')
              ? 'As tabelas do app Casa ainda não existem no banco. Rode a migração supabase/migrations/0020_casa.sql no SQL Editor do Supabase.'
              : msg}
        </p>
      </div>
    );
  }

  return (
    <CasaProvider dados={dados}>
      <ModaisCasa />
      {children}
    </CasaProvider>
  );
}
