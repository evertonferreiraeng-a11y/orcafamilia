import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { chaveConfigurada, conversarStream, montarSistema, painelEmTexto, planosEmTexto, type MensagemIA } from '@/lib/vida/ia';
import { carregarFinancas, financasEmTexto } from '@/lib/vida/financas';
import { INSTRUCOES_PADRAO } from '@/lib/vida/instrucoes';
import { mesRef } from '@/lib/vida/pilares';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LIMITE_HISTORICO = 40;

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sessão expirada. Entre de novo.' }, { status: 401 });
  if (!chaveConfigurada()) {
    return NextResponse.json({ error: 'A IA ainda não está configurada: falta a variável ANTHROPIC_API_KEY na Vercel.', codigo: 'sem_chave' }, { status: 503 });
  }

  const corpo = (await req.json().catch(() => ({}))) as { conversaId?: string; mensagem?: string; pilar?: number | null };
  const texto = (corpo.mensagem ?? '').trim();
  if (!texto) return NextResponse.json({ error: 'Escreva uma mensagem.' }, { status: 400 });

  // Conversa: usa a existente ou cria uma nova
  let conversaId = corpo.conversaId ?? null;
  let pilar: number | null = null;
  if (conversaId) {
    const { data: conv } = await supabase.from('vida_conversas').select('id, pilar').eq('id', conversaId).maybeSingle();
    if (!conv) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
    pilar = conv.pilar;
  } else {
    pilar = corpo.pilar && corpo.pilar >= 1 && corpo.pilar <= 10 ? corpo.pilar : null;
    const titulo = texto.replace(/\s+/g, ' ').slice(0, 70) + (texto.length > 70 ? '…' : '');
    const { data: nova, error } = await supabase.from('vida_conversas').insert({ titulo, pilar }).select('id').single();
    if (error || !nova) return NextResponse.json({ error: error?.message ?? 'Não foi possível criar a conversa.' }, { status: 500 });
    conversaId = nova.id;
  }

  const { error: erroMsg } = await supabase.from('vida_mensagens').insert({ conversa_id: conversaId, papel: 'user', conteudo: texto });
  if (erroMsg) return NextResponse.json({ error: erroMsg.message }, { status: 500 });

  const mes = mesRef();
  const [{ data: historico }, { data: ctx }, { data: painel }, financas, { data: planos }, { data: etapas }, { data: inds }, { data: regs }] = await Promise.all([
    supabase
      .from('vida_mensagens')
      .select('papel, conteudo, criado_em')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: false })
      .limit(LIMITE_HISTORICO),
    supabase.from('vida_contexto').select('texto').maybeSingle(),
    supabase.from('vida_avaliacoes').select('*').eq('mes', mes),
    carregarFinancas(supabase, user.id).catch(() => null),
    supabase.from('vida_planos').select('id, titulo, status, prazo, objetivo').neq('status', 'concluido').order('atualizado_em', { ascending: false }).limit(10),
    supabase.from('vida_etapas').select('plano_id, titulo, feita, prazo, ordem').order('ordem'),
    supabase.from('vida_indicadores').select('id, plano_id, nome, unidade, meta'),
    supabase.from('vida_registros').select('indicador_id, valor, data').order('data', { ascending: false }).limit(500),
  ]);
  const tituloPlano = new Map((planos ?? []).map((p) => [p.id, p.titulo]));
  const textoPlanos = planos
    ? planosEmTexto(
        planos,
        (etapas ?? []).filter((e) => tituloPlano.has(e.plano_id)).map((e) => ({ ...e, plano_titulo: tituloPlano.get(e.plano_id)! })),
        (inds ?? [])
          .filter((i) => tituloPlano.has(i.plano_id))
          .map((i) => {
            const ultimo = (regs ?? []).find((r) => r.indicador_id === i.id);
            return { plano_titulo: tituloPlano.get(i.plano_id)!, nome: i.nome, unidade: i.unidade, meta: i.meta, ultimo: ultimo ? Number(ultimo.valor) : null };
          })
      )
    : undefined;

  // A API exige começar por 'user' e alternar papéis: junta mensagens seguidas do mesmo papel.
  const msgs: MensagemIA[] = [];
  for (const m of (historico ?? []).reverse()) {
    const ultima = msgs[msgs.length - 1];
    if (ultima && ultima.role === m.papel) ultima.content += `\n\n${m.conteudo}`;
    else msgs.push({ role: m.papel, content: m.conteudo });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();

  const sistema = montarSistema({
    instrucoes: ctx?.texto?.trim() || INSTRUCOES_PADRAO,
    painel: painelEmTexto(painel ?? [], mes),
    pilarFoco: pilar,
    financas: financas ? financasEmTexto(financas) : undefined,
    planos: textoPlanos,
    hoje: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }),
  });

  const idConversa = conversaId as string;
  try {
    const stream = await conversarStream(sistema, msgs, async (resposta) => {
      if (!resposta.trim()) return;
      await supabase.from('vida_mensagens').insert({ conversa_id: idConversa, papel: 'assistant', conteudo: resposta });
      await supabase.from('vida_conversas').update({ atualizado_em: new Date().toISOString() }).eq('id', idConversa);
    });
    return new Response(stream, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-conversa-id': idConversa,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao falar com a IA.', conversaId: idConversa }, { status: 502 });
  }
}
