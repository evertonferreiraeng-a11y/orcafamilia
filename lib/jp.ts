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
type ItemGrupo = Pick<JpConvidado, 'convite' | 'nome' | 'ordem'> & { criado_em?: string };
export function agruparConvites<T extends ItemGrupo>(lista: T[]) {
  const mapa = new Map<string, T[]>();
  for (const c of [...lista].sort((a, b) => a.ordem - b.ordem || (a.criado_em ?? '').localeCompare(b.criado_em ?? ''))) {
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

/* ---------------- importação (colar do Excel) ---------------- */
export type LinhaImportada = { convite: string; nome: string; enviado: boolean; resposta: RespostaJp };

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
 * Nome do convite | Telefone (ignorado) | Nome do convidado | Convite (Sim/Não) | Situação (Sim/Não/Pendente).
 * Quando o nome do convite fica em branco, a pessoa entra no convite da linha de cima.
 */
export function lerPlanilhaColada(texto: string): LinhaImportada[] {
  const linhas: LinhaImportada[] = [];
  let conviteAtual = '';
  for (const bruta of texto.replace(/\r/g, '').split('\n')) {
    if (!bruta.trim()) continue;
    const c = bruta.split('\t').map((x) => x.trim());
    const [convite = '', , nome = '', enviado = '', situacao = ''] = c;
    if (norm(nome).startsWith('nome dos convidados') || norm(convite).startsWith('nome do convite')) continue; // cabeçalho
    if (!nome) continue;
    if (convite) conviteAtual = convite;
    linhas.push({
      convite: conviteAtual || nome,
      nome,
      enviado: lerResposta(enviado) === 'sim',
      resposta: lerResposta(situacao),
    });
  }
  return linhas;
}

/* ---------------- evento (dados do convite) ---------------- */
export const EVENTO_JP = {
  titulo: 'Meu Batizado',
  data: '2026-12-06',
  dataTexto: '06/12 (Domingo)',
  hora: '8h30',
  local: 'Igreja Matriz',
  cidade: 'Salto/SP',
  festa: 'Churrasco na chácara',
  endereco: 'Estrada do Lajeado, 14720',
  lembrete: 'Não esqueça seu kit churrasco e suas bebidas!',
  confirmarAte: '2026-11-27',
  confirmarAteTexto: '27/11',
};

/** Dias de hoje (fuso de São Paulo) até a data ISO. */
export function diasAte(iso: string) {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86_400_000);
}
