import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';
import { chaveConfigurada, montarSistema, painelEmTexto, perguntar } from '@/lib/vida/ia';
import { INSTRUCOES_PADRAO } from '@/lib/vida/instrucoes';
import { carregarFinancas, financasEmTexto } from '@/lib/vida/financas';
import { PILARES, mesRef } from '@/lib/vida/pilares';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ItemIA = {
  pilar: number;
  nota: number | null;
  situacao: string | null;
  problema: string | null;
  objetivo: string | null;
  proxima_acao: string | null;
  indicador: string | null;
};

const PEDIDO = `Com base SOMENTE no que foi dito nas conversas abaixo, no painel atual e nos dados financeiros reais do app, atualize o painel dos 10 pilares deste mês.

Regras:
- Não invente. Se não houver informação suficiente sobre um pilar, use null nos campos (inclusive na nota).
- Nota de 0 a 10 (pode usar meio ponto), refletindo a situação real descrita, não só a percepção da pessoa.
- Textos curtos (até ~140 caracteres cada), práticos e específicos.
- "proxima_acao" deve ser uma ação concreta e realizável na próxima semana.
- "indicador" deve ser algo mensurável (ex.: "treinos por semana", "R$ de dívida em aberto").

Responda APENAS com JSON válido, sem texto antes ou depois, neste formato:
{"pilares":[{"pilar":1,"nota":6.5,"situacao":"...","problema":"...","objetivo":"...","proxima_acao":"...","indicador":"..."}, ... os 10 pilares ...]}`;

export async function POST() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
  if (!chaveConfigurada()) return NextResponse.json({ error: 'Falta configurar a ANTHROPIC_API_KEY na Vercel.', codigo: 'sem_chave' }, { status: 503 });

  const mes = mesRef();
  const [{ data: msgs }, { data: convs }, { data: painel }, { data: ctx }] = await Promise.all([
    supabase.from('vida_mensagens').select('conversa_id, papel, conteudo, criado_em').order('criado_em', { ascending: false }).limit(150),
    supabase.from('vida_conversas').select('id, titulo, pilar'),
    supabase.from('vida_avaliacoes').select('*').eq('mes', mes),
    supabase.from('vida_contexto').select('texto').maybeSingle(),
  ]);
  if (!msgs?.length) return NextResponse.json({ error: 'Ainda não há conversas para avaliar. Comece pelo diagnóstico.' }, { status: 400 });

  const tituloDe = new Map((convs ?? []).map((c) => [c.id, c.titulo]));
  const porConversa = new Map<string, string[]>();
  for (const m of [...msgs].reverse()) {
    const lista = porConversa.get(m.conversa_id) ?? [];
    lista.push(`${m.papel === 'user' ? 'EU' : 'MENTOR'}: ${m.conteudo.slice(0, 1500)}`);
    porConversa.set(m.conversa_id, lista);
  }
  const transcricao = Array.from(porConversa.entries())
    .map(([id, linhas]) => `### Conversa: ${tituloDe.get(id) ?? 'sem título'}\n${linhas.join('\n')}`)
    .join('\n\n');

  const fin = await carregarFinancas(supabase, user.id).catch(() => null);
  const sistema = montarSistema({
    instrucoes: ctx?.texto?.trim() || INSTRUCOES_PADRAO,
    painel: painelEmTexto(painel ?? [], mes),
    financas: fin ? financasEmTexto(fin) : undefined,
    hoje: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  });

  let itens: ItemIA[] = [];
  try {
    const resposta = await perguntar(sistema, [{ role: 'user', content: `${PEDIDO}\n\n=== CONVERSAS ===\n${transcricao}` }]);
    const ini = resposta.indexOf('{');
    const fim = resposta.lastIndexOf('}');
    const json = JSON.parse(resposta.slice(ini, fim + 1));
    itens = Array.isArray(json.pilares) ? json.pilares : [];
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error && !(e instanceof SyntaxError) ? e.message : 'A IA devolveu uma resposta inválida. Tente de novo.' }, { status: 502 });
  }

  const limpa = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 400) : null);
  let atualizados = 0;
  for (const p of PILARES) {
    const it = itens.find((x) => Number(x.pilar) === p.n);
    if (!it) continue;
    const notaNum = it.nota == null || it.nota === ('' as unknown) ? null : Number(it.nota);
    const nota = notaNum != null && Number.isFinite(notaNum) ? Math.max(0, Math.min(10, Math.round(notaNum * 2) / 2)) : null;
    const campos = {
      situacao: limpa(it.situacao),
      problema: limpa(it.problema),
      objetivo: limpa(it.objetivo),
      proxima_acao: limpa(it.proxima_acao),
      indicador: limpa(it.indicador),
    };
    if (nota == null && Object.values(campos).every((v) => v == null)) continue;

    // Mescla: o que a IA não soube dizer mantém o que já estava no painel.
    const atual = (painel ?? []).find((a) => a.pilar === p.n);
    const registro = {
      mes,
      pilar: p.n,
      nota: nota ?? atual?.nota ?? null,
      situacao: campos.situacao ?? atual?.situacao ?? null,
      problema: campos.problema ?? atual?.problema ?? null,
      objetivo: campos.objetivo ?? atual?.objetivo ?? null,
      proxima_acao: campos.proxima_acao ?? atual?.proxima_acao ?? null,
      indicador: campos.indicador ?? atual?.indicador ?? null,
      origem: 'ia' as const,
      atualizado_em: new Date().toISOString(),
    };
    const { error } = await supabase.from('vida_avaliacoes').upsert(registro, { onConflict: 'user_id,mes,pilar' });
    if (!error) atualizados++;
  }

  revalidatePath('/vida');
  return NextResponse.json({ atualizados });
}
