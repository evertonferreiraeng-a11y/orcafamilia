import { createServerSupabase } from '@/lib/supabase-server';
import { carregarEstoque } from '@/lib/estoque/carregar';
import { EstoqueProvider } from '@/components/estoque/EstoqueContext';
import { ModaisEstoque } from '@/components/estoque/ModaisEstoque';
import type { DadosEstoque } from '@/lib/estoque/calc';

export const dynamic = 'force-dynamic';

export default async function EstoqueLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let dados: DadosEstoque;
  try {
    dados = await carregarEstoque(supabase);
  } catch (e) {
    const msg = (e as Error).message;
    return (
      <div className="card mx-auto max-w-xl p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Não foi possível abrir o estoque</h2>
        <p className="text-sm text-gray-600">
          {msg.includes('SEM_FAMILIA')
            ? 'Seu usuário ainda não está vinculado a uma família. Crie ou entre em uma família em Família.'
            : msg.includes('estoque_')
              ? 'As tabelas do estoque ainda não existem no banco. Rode a migração supabase/migrations/0019_estoque_familiar.sql no Supabase.'
              : msg}
        </p>
      </div>
    );
  }

  return (
    <EstoqueProvider dados={dados}>
      <ModaisEstoque />
      {children}
    </EstoqueProvider>
  );
}
