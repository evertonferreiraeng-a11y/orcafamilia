// Usado só no servidor (rotas /api/vida): a chave da API nunca vai para o navegador.
import { INSTRUCOES_FIXAS } from '@/lib/vida/instrucoes';
import { INSTRUCOES_PLANOS } from '@/lib/vida/planos';
import { PILARES } from '@/lib/vida/pilares';
import type { VidaAvaliacao } from '@/types/database';

/** Modelo usado pelo Mentor de Vida — dá para trocar pela variável ANTHROPIC_MODEL na Vercel. */
export const MODELO_PADRAO = 'claude-sonnet-5-5';

export function chaveConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type MensagemIA = { role: 'user' | 'assistant'; content: string };

const nomeMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

/** Resumo do painel em texto, para a IA saber onde a pessoa está. */
export function painelEmTexto(avaliacoes: VidaAvaliacao[], mes: string): string {
  if (!avaliacoes.length) return `Painel de ${nomeMes(mes)}: ainda vazio (nenhuma avaliação registrada).`;
  const linhas = PILARES.map((p) => {
    const a = avaliacoes.find((x) => x.pilar === p.n);
    if (!a) return `${p.n}. ${p.nome}: sem avaliação`;
    const partes = [
      `nota ${a.nota ?? '—'}`,
      a.situacao && `situação: ${a.situacao}`,
      a.problema && `problema: ${a.problema}`,
      a.objetivo && `objetivo: ${a.objetivo}`,
      a.proxima_acao && `próxima ação: ${a.proxima_acao}`,
      a.indicador && `indicador: ${a.indicador}`,
    ].filter(Boolean);
    return `${p.n}. ${p.nome}: ${partes.join(' | ')}`;
  });
  return `Painel de ${nomeMes(mes)}:\n${linhas.join('\n')}`;
}

export function montarSistema(opts: { instrucoes: string; painel: string; pilarFoco?: number | null; hoje: string; financas?: string; planos?: string }): string {
  const foco = opts.pilarFoco ? PILARES.find((p) => p.n === opts.pilarFoco) : null;
  return [
    INSTRUCOES_FIXAS,
    `Data de hoje: ${opts.hoje}.`,
    '--- INSTRUÇÕES E CONTEXTO PESSOAL (escritos pelo usuário) ---',
    opts.instrucoes,
    '--- PAINEL ATUAL ---',
    opts.painel,
    opts.financas ? `--- FINANÇAS (dados do app) ---\n${opts.financas}` : '',
    opts.planos ? `--- PLANOS SALVOS ---\n${opts.planos}` : '',
    INSTRUCOES_PLANOS,
    foco ? `--- FOCO DESTA CONVERSA ---\nEsta conversa é sobre o pilar ${foco.n}. ${foco.nome}. Mantenha o foco nele, mas aponte conexões com outros pilares quando forem relevantes.` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function chamar(body: Record<string, unknown>): Promise<Response> {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || MODELO_PADRAO, ...body }),
  });
}

function mensagemErro(status: number, texto: string): string {
  if (status === 401) return 'A chave da API da Anthropic é inválida. Confira a variável ANTHROPIC_API_KEY na Vercel.';
  if (status === 429) return 'Limite de uso da API atingido. Tente de novo em instantes.';
  if (status === 400 && /credit|billing|balance/i.test(texto)) return 'Sem créditos na conta da API da Anthropic. Adicione créditos no console da Anthropic.';
  if (status === 404 && /model/i.test(texto)) return 'Modelo de IA não encontrado. Ajuste ANTHROPIC_MODEL na Vercel.';
  return `A IA não respondeu (erro ${status}).`;
}

/**
 * Conversa com streaming: devolve um ReadableStream só com o texto,
 * e chama `aoTerminar` com a resposta completa (para salvar no banco).
 */
export async function conversarStream(
  sistema: string,
  mensagens: MensagemIA[],
  aoTerminar: (texto: string) => Promise<void>
): Promise<ReadableStream<Uint8Array>> {
  const resp = await chamar({ system: sistema, messages: mensagens, max_tokens: 2000, stream: true });
  if (!resp.ok || !resp.body) {
    const t = await resp.text().catch(() => '');
    throw new Error(mensagemErro(resp.status, t));
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const leitor = resp.body.getReader();
  let buffer = '';
  let completo = '';

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await leitor.read();
      if (done) {
        try {
          await aoTerminar(completo);
        } finally {
          controller.close();
        }
        return;
      }
      buffer += dec.decode(value, { stream: true });
      const linhas = buffer.split('\n');
      buffer = linhas.pop() ?? '';
      for (const linha of linhas) {
        if (!linha.startsWith('data:')) continue;
        const json = linha.slice(5).trim();
        if (!json) continue;
        try {
          const ev = JSON.parse(json);
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
            completo += ev.delta.text;
            controller.enqueue(enc.encode(ev.delta.text));
          } else if (ev.type === 'error') {
            const msg = `\n\n⚠️ ${ev.error?.message ?? 'Erro na resposta da IA.'}`;
            completo += msg;
            controller.enqueue(enc.encode(msg));
          }
        } catch {
          // linha incompleta/sem JSON — ignora
        }
      }
    },
    cancel() {
      leitor.cancel().catch(() => {});
    },
  });
}

/** Chamada simples (sem streaming) que devolve o texto completo. */
export async function perguntar(sistema: string, mensagens: MensagemIA[], maxTokens = 4000): Promise<string> {
  const resp = await chamar({ system: sistema, messages: mensagens, max_tokens: maxTokens });
  const t = await resp.text();
  if (!resp.ok) throw new Error(mensagemErro(resp.status, t));
  const dados = JSON.parse(t);
  return (dados.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');
}

/** Planos salvos em texto (para a IA acompanhar e cobrar). */
export function planosEmTexto(
  planos: { titulo: string; status: string; prazo: string | null; objetivo: string | null }[],
  etapas: { plano_titulo: string; titulo: string; feita: boolean; prazo: string | null }[],
  indicadores: { plano_titulo: string; nome: string; unidade: string; meta: number | null; ultimo: number | null }[]
): string {
  if (!planos.length) return 'Nenhum plano salvo ainda.';
  return planos
    .map((p) => {
      const ets = etapas.filter((e) => e.plano_titulo === p.titulo);
      const feitas = ets.filter((e) => e.feita).length;
      const pend = ets.filter((e) => !e.feita).slice(0, 4).map((e) => `${e.titulo}${e.prazo ? ` (até ${e.prazo})` : ''}`);
      const inds = indicadores.filter((i) => i.plano_titulo === p.titulo).map((i) => `${i.nome}: ${i.ultimo ?? '—'}${i.unidade ? ` ${i.unidade}` : ''} (meta ${i.meta ?? '—'})`);
      return [
        `• ${p.titulo} [${p.status}]${p.prazo ? ` prazo ${p.prazo}` : ''}${p.objetivo ? ` — ${p.objetivo}` : ''}`,
        ets.length ? `  etapas: ${feitas}/${ets.length} feitas${pend.length ? `; próximas: ${pend.join('; ')}` : ''}` : '',
        inds.length ? `  indicadores: ${inds.join('; ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');
}
