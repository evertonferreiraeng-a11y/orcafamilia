import { createServerSupabase } from '@/lib/supabase-server';
import { ChatVida } from '@/components/vida/ChatVida';
import { ConfigurarVida } from '@/components/vida/ConfigurarVida';
import { chaveConfigurada } from '@/lib/vida/ia';

export const dynamic = 'force-dynamic';

export default async function ConversasVidaPage({ searchParams }: { searchParams: { c?: string; pilar?: string; texto?: string } }) {
  const supabase = createServerSupabase();
  const { data: conversas, error } = await supabase
    .from('vida_conversas')
    .select('id, titulo, pilar, atualizado_em')
    .order('atualizado_em', { ascending: false })
    .limit(200);
  if (error) return <ConfigurarVida faltaBanco faltaChave={!chaveConfigurada()} />;

  const ativa = searchParams.c && (conversas ?? []).some((c) => c.id === searchParams.c) ? searchParams.c : null;
  let mensagens: { id: string; papel: 'user' | 'assistant'; conteudo: string }[] = [];
  if (ativa) {
    const { data } = await supabase.from('vida_mensagens').select('id, papel, conteudo').eq('conversa_id', ativa).order('criado_em', { ascending: true });
    mensagens = data ?? [];
  }
  const pilar = Number(searchParams.pilar);

  return (
    <ChatVida
      key={ativa ?? `nova-${searchParams.pilar ?? ''}`}
      conversas={conversas ?? []}
      conversaInicial={ativa}
      mensagensIniciais={mensagens}
      chaveOk={chaveConfigurada()}
      pilarInicial={pilar >= 1 && pilar <= 10 ? pilar : null}
      textoInicial={ativa ? undefined : searchParams.texto?.slice(0, 2000)}
    />
  );
}
