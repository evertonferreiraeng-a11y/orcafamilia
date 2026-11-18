import { createServerSupabase } from '@/lib/supabase-server';
import { JpPublico } from '@/components/jp/JpPublico';
import type { JpConvidadoPublico } from '@/types/database';

export const metadata = { title: 'JP – Lista de convidados', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ConvidadosPublicoPage({ params }: { params: { token: string } }) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.rpc('jp_lista_publica', { p_token: params.token });

  const lista = (data ?? []) as JpConvidadoPublico[];
  if (error || lista.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="card max-w-sm p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900">Link indisponível</h1>
          <p className="mt-1 text-sm text-gray-500">Este link de acompanhamento não existe mais ou foi trocado. Peça um link novo.</p>
        </div>
      </main>
    );
  }

  const agora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date());
  return <JpPublico lista={lista} atualizadoAs={agora} />;
}
