import type { FonteIndicador } from '@/types/database';

/** Plano proposto pela IA (bloco ```plano ... ``` na resposta) ou pelo simulador de dívidas. */
export interface PropostaPlano {
  titulo: string;
  pilar: number | null;
  objetivo: string | null;
  resumo: string | null;
  prazo: string | null; // yyyy-MM-dd
  etapas: { titulo: string; detalhe: string | null; prazo: string | null }[];
  indicadores: { nome: string; unidade: string; meta: number | null; inicial: number | null; direcao: 'subir' | 'descer'; fonte: FonteIndicador }[];
}

const FONTES: FonteIndicador[] = ['manual', 'dividas_restante', 'sobra_mes', 'cofre_saldo'];

export const ROTULO_FONTE: Record<FonteIndicador, string> = {
  manual: 'você registra',
  dividas_restante: 'automático · dívidas em aberto',
  sobra_mes: 'automático · sobra do mês',
  cofre_saldo: 'automático · saldo no Cofre',
};

const txt = (v: unknown, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const data = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : null);
const num = (v: unknown) => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Valida/normaliza um objeto qualquer como PropostaPlano (null se inválido). */
export function normalizarProposta(o: unknown): PropostaPlano | null {
  if (!o || typeof o !== 'object') return null;
  const x = o as Record<string, unknown>;
  const titulo = txt(x.titulo, 120);
  if (!titulo) return null;
  const pilar = num(x.pilar);
  const etapas = (Array.isArray(x.etapas) ? x.etapas : [])
    .map((e) => (typeof e === 'string' ? { titulo: e } : (e as Record<string, unknown>)))
    .map((e) => ({ titulo: txt(e.titulo, 200), detalhe: txt(e.detalhe, 500), prazo: data(e.prazo) }))
    .filter((e) => Boolean(e.titulo))
    .slice(0, 30) as PropostaPlano['etapas'];
  const indicadores = (Array.isArray(x.indicadores) ? x.indicadores : [])
    .map((i) => i as Record<string, unknown>)
    .map((i) => ({
      nome: txt(i.nome, 120),
      unidade: txt(i.unidade, 20) ?? '',
      meta: num(i.meta),
      inicial: num(i.inicial),
      direcao: i.direcao === 'descer' ? ('descer' as const) : ('subir' as const),
      fonte: FONTES.includes(i.fonte as FonteIndicador) ? (i.fonte as FonteIndicador) : ('manual' as const),
    }))
    .filter((i) => Boolean(i.nome))
    .slice(0, 8) as PropostaPlano['indicadores'];
  return {
    titulo,
    pilar: pilar != null && pilar >= 1 && pilar <= 10 ? Math.round(pilar) : null,
    objetivo: txt(x.objetivo, 400),
    resumo: txt(x.resumo, 1200),
    prazo: data(x.prazo),
    etapas,
    indicadores,
  };
}

/** Separa o texto da resposta em trechos de texto normal e propostas de plano. */
export function extrairPlanos(texto: string): ({ tipo: 'texto'; conteudo: string } | { tipo: 'plano'; plano: PropostaPlano } | { tipo: 'plano_incompleto' })[] {
  const partes: ({ tipo: 'texto'; conteudo: string } | { tipo: 'plano'; plano: PropostaPlano } | { tipo: 'plano_incompleto' })[] = [];
  const re = /```plano\s*([\s\S]*?)(```|$)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push({ tipo: 'texto', conteudo: texto.slice(ultimo, m.index) });
    const fechado = m[2] === '```';
    if (!fechado) {
      partes.push({ tipo: 'plano_incompleto' }); // ainda chegando pelo streaming
    } else {
      try {
        const p = normalizarProposta(JSON.parse(m[1]));
        partes.push(p ? { tipo: 'plano', plano: p } : { tipo: 'texto', conteudo: m[0] });
      } catch {
        partes.push({ tipo: 'texto', conteudo: m[0] });
      }
    }
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push({ tipo: 'texto', conteudo: texto.slice(ultimo) });
  return partes;
}

/** Instruções para a IA sobre como propor planos. */
export const INSTRUCOES_PLANOS = `Planos de ação (o app salva e acompanha):
- Quando você e o usuário chegarem a um plano concreto (ex.: sair das dívidas, trocar de emprego, rotina de exercícios, cuidar da saúde mental), PROPONHA o plano num bloco de código com a linguagem "plano" contendo JSON válido, logo após explicar o raciocínio. O app mostra um botão "Salvar plano".
- Só proponha um plano quando houver informação suficiente; antes disso, faça perguntas.
- Etapas: ações concretas e realistas, com prazo (yyyy-MM-dd) quando fizer sentido, em ordem. Prefira 3 a 10 etapas.
- Indicadores: mensuráveis, com meta numérica. Use "fonte" automática quando existir: "dividas_restante" (R$ que falta pagar nas dívidas; direcao "descer", meta 0), "sobra_mes" (R$ que sobra no mês; direcao "subir"), "cofre_saldo" (R$ guardado; direcao "subir"). Caso contrário, "manual".
- Datas a partir de hoje. Valores em número, sem "R$".
Formato exato:
\`\`\`plano
{"titulo":"Sair das dívidas","pilar":5,"objetivo":"Quitar todas as dívidas até dez/2027","resumo":"Avalanche: quitar primeiro o cartão (12% a.m.)...","prazo":"2027-12-31","etapas":[{"titulo":"Renegociar o cartão","detalhe":"Pedir troca por empréstimo com juros menores","prazo":"2026-12-15"}],"indicadores":[{"nome":"Dívida em aberto","unidade":"R$","meta":0,"direcao":"descer","fonte":"dividas_restante"}]}
\`\`\`
- Ajustar um plano já salvo: proponha de novo com o mesmo título; o usuário decide se salva como novo.`;
