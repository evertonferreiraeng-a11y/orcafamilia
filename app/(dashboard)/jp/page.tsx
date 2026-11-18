import { createServerSupabase } from '@/lib/supabase-server';
import { JpClient } from '@/components/jp/JpClient';
import type { JpConvidado } from '@/types/database';

export const metadata = { title: 'JP – Lista de convidados' };
export const dynamic = 'force-dynamic';

export default async function JpPage({ searchParams }: { searchParams: { resposta?: string; enviado?: string } }) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('jp_convidados').select('*').order('ordem').order('criado_em').range(0, 4999);

  if (error) {
    return (
      <div className="card mx-auto max-w-xl p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Não foi possível abrir o JP</h2>
        <p className="text-sm text-gray-600">
          {error.message.includes('jp_convidados')
            ? 'A tabela do JP ainda não existe no banco. Rode a migração supabase/migrations/0027_jp.sql no SQL Editor do Supabase.'
            : error.message}
        </p>
      </div>
    );
  }

  const resposta = ['sim', 'nao', 'pendente'].includes(searchParams.resposta ?? '') ? (searchParams.resposta as 'sim' | 'nao' | 'pendente') : 'todos';
  const enviado = searchParams.enviado === 'sim' || searchParams.enviado === 'nao' ? searchParams.enviado : 'todos';

  return <JpClient inicial={(data ?? []) as JpConvidado[]} filtroResposta={resposta} filtroEnviado={enviado} />;
}
