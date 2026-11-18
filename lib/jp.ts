import type { JpConvidado, RespostaJp } from '@/types/database';

export const RESPOSTAS: { id: RespostaJp; rotulo: string }[] = [
  { id: 'sim', rotulo: 'Sim' },
  { id: 'nao', rotulo: 'Não' },
  { id: 'pendente', rotulo: 'Pendente' },
];

export type ResumoJp = {
  pessoas: number;
  convites: number;
  enviados: number; // pessoas com convite enviado
  naoEnviados: number;
  convitesEnviados: number; // convites (famílias) com todos marcados como enviado
  convitesNaoEnviados: number; // convites (famílias) com alguém sem convite enviado
  familiasVao: number; // convites com pelo menos uma pessoa confirmada (1 brinde por família)
  familiasNaoVao: number; // convites em que todos responderam não
  familiasSemResposta: number; // nenhuma confirmação ainda e alguém pendente
  sim: number;
  nao: number;
  pendente: number;
};

/** Agrupa as pessoas pelo nome do convite, mantendo a ordem da lista. */
export function agruparConvites(lista: JpConvidado[]) {
  const mapa = new Map<string, JpConvidado[]>();
  for (const c of [...lista].sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em))) {
    const chave = c.convite.trim() || c.nome;
    const g = mapa.get(chave);
    if (g) g.push(c);
    else mapa.set(chave, [c]);
  }
  return [...mapa.entries()].map(([convite, pessoas]) => ({ convite, pessoas }));
}

export function resumoJp(lista: Pick<JpConvidado, 'convite' | 'nome' | 'enviado' | 'resposta'>[]): ResumoJp {
  const grupos = new Map<string, { enviados: boolean; respostas: RespostaJp[] }>();
  for (const c of lista) {
    const chave = c.convite.trim() || c.nome;
    const g = grupos.get(chave) ?? { enviados: true, respostas: [] };
    g.enviados = g.enviados && c.enviado;
    g.respostas.push(c.resposta);
    grupos.set(chave, g);
  }
  const gs = [...grupos.values()];
  const vao = gs.filter((g) => g.respostas.includes('sim')).length;
  const naoVao = gs.filter((g) => g.respostas.every((r) => r === 'nao')).length;
  const conta = (r: RespostaJp) => lista.filter((c) => c.resposta === r).length;
  const enviados = lista.filter((c) => c.enviado).length;
  return {
    pessoas: lista.length,
    convites: grupos.size,
    enviados,
    naoEnviados: lista.length - enviados,
    convitesEnviados: gs.filter((g) => g.enviados).length,
    convitesNaoEnviados: gs.filter((g) => !g.enviados).length,
    familiasVao: vao,
    familiasNaoVao: naoVao,
    familiasSemResposta: gs.length - vao - naoVao,
    sim: conta('sim'),
    nao: conta('nao'),
    pendente: conta('pendente'),
  };
}

/* ---------------- telefone / WhatsApp ---------------- */
export function soDigitos(t: string | null | undefined) {
  return (t ?? '').replace(/\D/g, '');
}

/** Formata como (11) 98443-2868. Devolve null para vazio ou "-". */
export function formatarTelefone(t: string | number | null | undefined): string | null {
  const bruto = String(t ?? '').trim();
  if (!bruto || bruto === '-') return null;
  let d = soDigitos(bruto);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return bruto;
}

export function linkWhatsApp(telefone: string | null | undefined, mensagem?: string) {
  let d = soDigitos(telefone);
  if (d.length < 10) return null;
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`;
}

/* ---------------- importação (colar do Excel) ---------------- */
export type LinhaImportada = { convite: string; nome: string; telefone: string | null; enviado: boolean; resposta: RespostaJp };

const norm = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

function lerResposta(t: string): RespostaJp {
  const v = norm(t);
  if (v === 'sim' || v === 's' || v === 'confirmado') return 'sim';
  if (v === 'nao' || v === 'n') return 'nao';
  return 'pendente';
}

/**
 * Lê as células copiadas do Excel (colunas A a E):
 * Nome do convite | Telefone | Nome do convidado | Convite (Sim/Não) | Situação (Sim/Não/Pendente).
 * Quando o nome do convite fica em branco, a pessoa entra no convite da linha de cima.
 */
export function lerPlanilhaColada(texto: string): LinhaImportada[] {
  const linhas: LinhaImportada[] = [];
  let conviteAtual = '';
  for (const bruta of texto.replace(/\r/g, '').split('\n')) {
    if (!bruta.trim()) continue;
    const c = bruta.split('\t').map((x) => x.trim());
    const [convite = '', telefone = '', nome = '', enviado = '', situacao = ''] = c;
    if (norm(nome).startsWith('nome dos convidados') || norm(convite).startsWith('nome do convite')) continue; // cabeçalho
    if (!nome) continue;
    if (convite) conviteAtual = convite;
    linhas.push({
      convite: conviteAtual || nome,
      nome,
      telefone: formatarTelefone(telefone),
      enviado: lerResposta(enviado) === 'sim',
      resposta: lerResposta(situacao),
    });
  }
  return linhas;
}
