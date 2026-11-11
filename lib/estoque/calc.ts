// Regras de negócio do módulo Estoque Familiar (puras, sem dependências).
// As operações que alteram quantidades rodam no banco (funções estoque_*);
// aqui ficam os cálculos de exibição, alertas, previsões e relatórios.
import type {
  EstoqueConfig,
  EstoqueLocal,
  EstoqueListaItem,
  EstoqueLote,
  EstoqueMov,
  EstoqueProduto,
  TipoMovEstoque,
  TipoProdutoEstoque,
  TipoSaidaEstoque,
} from '@/types/database';

export type DadosEstoque = {
  config: EstoqueConfig;
  locais: EstoqueLocal[];
  produtos: EstoqueProduto[];
  lotes: EstoqueLote[];
  movs: EstoqueMov[];
  /** Lista de compras manual; null quando a migração 0021 ainda não foi aplicada. */
  lista: EstoqueListaItem[] | null;
};

export type StatusProduto = 'green' | 'amber' | 'red' | 'sm';
export type AlertaLote = 'venc' | 'd30' | 'd60' | 'd90' | 'ok' | 'none';

export const TIPOS_MOV: Record<TipoMovEstoque, string> = {
  entrada: 'Entrada',
  reposicao: 'Entrada (reposição)', // tipo antigo, mantido só para o histórico
  consumo: 'Saída p/ consumo',
  perda: 'Perda',
  danificado: 'Danificado',
  descarte: 'Descarte por vencimento',
  ajuste: 'Ajuste de inventário',
};
export const SAIDAS: TipoSaidaEstoque[] = ['consumo', 'perda', 'danificado', 'descarte'];
export const TIPOS_PRODUTO: Record<TipoProdutoEstoque, string> = {
  alimento: 'Alimento',
  agua: 'Água potável',
  bebe: 'Bebê (controle separado)',
};
export const STATUS_LABEL: Record<StatusProduto, string> = {
  green: 'Completo',
  amber: 'Abaixo da meta',
  red: 'Sem estoque',
  sm: 'Meta não definida',
};
export const ALERTA_LABEL: Record<AlertaLote, string> = {
  venc: 'Vencido',
  d30: 'Vence em até 30 dias',
  d60: 'Vence em até 60 dias',
  d90: 'Vence em até 90 dias',
  ok: 'Dentro da validade',
  none: 'Sem validade informada',
};
export const UNIDADES = ['kg', 'g', 'litros', 'ml', 'unidades', 'latas', 'sachês', 'pacotes', 'caixas', 'garrafas', 'potes'];
export const CAPACIDADES = [0.5, 1, 1.5, 2, 5, 10, 20];
export const CONDICOES = {
  umidade: ['Adequada', 'Atenção', 'Inadequada'],
  temperatura: ['Fresco', 'Ambiente', 'Quente'],
  sol: ['Sem exposição', 'Luz indireta', 'Sol direto'],
  embalagem: ['Íntegra', 'Verificar', 'Com avarias'],
} as const;

/* ---------- utilidades ---------- */
export const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;
export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const soma = <T,>(a: T[], f: (x: T) => number) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);

/** Converte texto digitado (aceita vírgula decimal e milhar com ponto) em número. */
export function parseNumero(v: unknown): number {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').trim().replace(/\s|R\$/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN;
}
export const fmtQtd = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
export const fmtMoeda = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmtPct = (n: number) => `${(Math.round((Number(n) || 0) * 10) / 10).toLocaleString('pt-BR')}%`;
export const fmtData = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
export const paraInput = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? '' : String(r3(n)).replace('.', ',');

export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function diasAte(iso?: string | null, hoje = hojeISO()): number | null {
  if (!iso) return null;
  return Math.round((new Date(`${iso.slice(0, 10)}T00:00:00`).getTime() - new Date(`${hoje}T00:00:00`).getTime()) / 864e5);
}
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const fmtMesCurto = (k: string) => `${MESES[Number(k.slice(5, 7)) - 1]}/${k.slice(2, 4)}`;
export const fmtMesLongo = (k: string) => `${MESES_LONGOS[Number(k.slice(5, 7)) - 1]} de ${k.slice(0, 4)}`;
export function ultimosMeses(n: number, base = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}
export const ordenarPorNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, 'pt-BR');

/* ---------- cálculos por produto / lote ---------- */
export function lotesDoProduto(d: DadosEstoque, pid: string) {
  return d.lotes.filter((l) => l.produto_id === pid);
}
export const loteVencido = (l: EstoqueLote, hoje = hojeISO()) => !!(l.validade && l.validade < hoje);
export const estoqueAtual = (d: DadosEstoque, p: EstoqueProduto) => r3(soma(lotesDoProduto(d, p.id), (l) => l.qtd_atual));
export const estoqueDisponivel = (d: DadosEstoque, p: EstoqueProduto) =>
  r3(soma(lotesDoProduto(d, p.id).filter((l) => l.qtd_atual > 0 && !loteVencido(l)), (l) => l.qtd_atual));
export const estoqueVencido = (d: DadosEstoque, p: EstoqueProduto) =>
  r3(soma(lotesDoProduto(d, p.id).filter((l) => l.qtd_atual > 0 && loteVencido(l)), (l) => l.qtd_atual));
export const reposicao = (d: DadosEstoque, p: EstoqueProduto) => (p.meta > 0 ? r3(Math.max(p.meta - estoqueAtual(d, p), 0)) : 0);
export function statusProduto(d: DadosEstoque, p: EstoqueProduto): StatusProduto {
  const a = estoqueAtual(d, p);
  if (!(p.meta > 0)) return 'sm';
  if (a <= 0) return 'red';
  if (a >= p.meta) return 'green';
  return 'amber';
}
export const abaixoDoMinimo = (d: DadosEstoque, p: EstoqueProduto) => p.minimo > 0 && estoqueAtual(d, p) < p.minimo;
export const percentualMeta = (d: DadosEstoque, p: EstoqueProduto) => (p.meta > 0 ? Math.min(Math.max(estoqueAtual(d, p), 0) / p.meta, 1) : 0);
export const custoUnitarioLote = (l: EstoqueLote) => (l.qtd_inicial > 0 && l.valor > 0 ? l.valor / l.qtd_inicial : 0);
export const valorEmEstoque = (l: EstoqueLote) => Math.max(l.qtd_atual, 0) * custoUnitarioLote(l);
export function precoUnitario(d: DadosEstoque, p: EstoqueProduto): number {
  const ls = lotesDoProduto(d, p.id)
    .filter((l) => l.valor > 0 && l.qtd_inicial > 0)
    .sort((a, b) => (b.data_compra || '').localeCompare(a.data_compra || '') || (b.criado_em || '').localeCompare(a.criado_em || ''));
  return ls.length ? custoUnitarioLote(ls[0]) : Number(p.preco_ref) || 0;
}
export function percentualReserva(d: DadosEstoque, tipos: TipoProdutoEstoque[]): number {
  const ps = d.produtos.filter((p) => tipos.includes(p.tipo) && p.meta > 0);
  return ps.length ? (soma(ps, (p) => percentualMeta(d, p)) / ps.length) * 100 : 0;
}
export function alertaLote(l: EstoqueLote, hoje = hojeISO()): AlertaLote {
  const n = diasAte(l.validade, hoje);
  if (n === null) return 'none';
  if (n < 0) return 'venc';
  if (n <= 30) return 'd30';
  if (n <= 60) return 'd60';
  if (n <= 90) return 'd90';
  return 'ok';
}
export function textoPrazo(l: EstoqueLote): string {
  const n = diasAte(l.validade);
  if (n === null) return '—';
  if (n < 0) return `vencido há ${-n} d`;
  if (n === 0) return 'vence hoje';
  return `${n} d`;
}
/** Ordem FEFO: primeiro a vencer, primeiro a sair (sem validade por último). */
export const ordemFEFO = (a: EstoqueLote, b: EstoqueLote) =>
  (a.validade || '9999-12-31').localeCompare(b.validade || '9999-12-31') ||
  (a.data_compra || '').localeCompare(b.data_compra || '') ||
  (a.criado_em || '').localeCompare(b.criado_em || '');

/** Previsão da baixa (espelha a função estoque_saida do banco) para mostrar antes de confirmar. */
export function planoSaida(d: DadosEstoque, pid: string, qtd: number, tipo: TipoSaidaEstoque, loteId?: string | null) {
  let lots = loteId
    ? d.lotes.filter((l) => l.id === loteId && l.qtd_atual > 0)
    : lotesDoProduto(d, pid).filter((l) => l.qtd_atual > 0 && (tipo !== 'consumo' || !loteVencido(l)));
  lots = [...lots].sort(ordemFEFO);
  let resto = r3(qtd);
  const alocacao: { lote: EstoqueLote; qtd: number }[] = [];
  for (const l of lots) {
    if (resto <= 0) break;
    const t = r3(Math.min(resto, l.qtd_atual));
    alocacao.push({ lote: l, qtd: t });
    resto = r3(resto - t);
  }
  return { alocacao, falta: Math.max(resto, 0), disponivel: r3(soma(lots, (l) => l.qtd_atual)) };
}

/* ---------- movimentações / financeiro ---------- */
export const compras = (d: DadosEstoque) => d.movs.filter((m) => !m.estornado && (m.tipo === 'entrada' || m.tipo === 'reposicao'));
export const movsAtivas = (d: DadosEstoque, tipos: TipoMovEstoque[]) => d.movs.filter((m) => !m.estornado && tipos.includes(m.tipo));
export const gastoNoMes = (d: DadosEstoque, mes: string) => r2(soma(compras(d).filter((m) => m.data.startsWith(mes)), (m) => m.valor));
export const categoriasDe = (d: DadosEstoque) =>
  [...new Set(d.produtos.map((p) => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
export const fornecedoresDe = (d: DadosEstoque) =>
  [...new Set(d.lotes.map((l) => l.fornecedor).filter((f): f is string => !!f))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

export function comparacaoPrecos(d: DadosEstoque) {
  return d.produtos
    .map((p) => {
      const cs = compras(d)
        .filter((m) => m.produto_id === p.id && m.valor > 0 && m.qtd > 0)
        .sort((a, b) => a.data.localeCompare(b.data) || a.criado_em.localeCompare(b.criado_em));
      if (!cs.length) return null;
      const u = cs.map((m) => ({ v: m.valor / m.qtd, f: d.lotes.find((l) => l.id === m.lote_id)?.fornecedor || '', data: m.data }));
      const ultimo = u[u.length - 1];
      const anterior = u.length > 1 ? u[u.length - 2] : null;
      const menor = u.reduce((a, b) => (b.v < a.v ? b : a));
      const maior = u.reduce((a, b) => (b.v > a.v ? b : a));
      return {
        produto: p,
        n: u.length,
        ultimo,
        anterior,
        menor,
        maior,
        media: soma(u, (x) => x.v) / u.length,
        variacao: anterior ? (ultimo.v / anterior.v - 1) * 100 : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => ordenarPorNome(a.produto, b.produto));
}

export function itensParaComprar(d: DadosEstoque) {
  return d.produtos
    .filter((p) => p.meta > 0 && reposicao(d, p) > 0)
    .sort((a, b) => percentualMeta(d, a) - percentualMeta(d, b) || ordenarPorNome(a, b))
    .map((p) => ({ produto: p, comprar: reposicao(d, p), precoUnit: precoUnitario(d, p) }));
}

/* ---------- relatórios ---------- */
export type ColunaRel = { titulo: string; chave: string; tipo?: 'num' | 'moeda' };
export type Relatorio = { colunas: ColunaRel[]; linhas: Record<string, string | number | null>[]; totais?: string[]; sub?: string };
export const RELATORIOS = {
  inventario: 'Inventário completo',
  abaixo: 'Produtos abaixo da meta',
  vencendo: 'Produtos próximos do vencimento (até 90 dias)',
  vencidos: 'Produtos vencidos',
  compras: 'Histórico de entradas (compras)',
  consumo: 'Histórico de consumo e saídas',
  reposicao: 'Lista de reposição',
  agua: 'Relatório de água',
} as const;
export type TipoRelatorio = keyof typeof RELATORIOS;

/** Relatórios do estoque — só quantidades e datas (o controle de valores foi retirado). */
export function gerarRelatorio(d: DadosEstoque, tipo: TipoRelatorio, f: { de?: string; ate?: string } = {}): Relatorio {
  const r = montarRelatorio(d, tipo, f);
  const colunas = r.colunas.filter((c) => c.tipo !== 'moeda');
  const chaves = new Set(colunas.map((c) => c.chave));
  const totais = (r.totais ?? []).filter((k) => chaves.has(k));
  return { ...r, colunas, totais: totais.length ? totais : undefined };
}

function montarRelatorio(d: DadosEstoque, tipo: TipoRelatorio, f: { de?: string; ate?: string }): Relatorio {
  const prod = (id: string) => d.produtos.find((p) => p.id === id);
  const local = (id: string | null) => (id ? d.locais.find((l) => l.id === id)?.nome || '' : '');
  const noPeriodo = (m: EstoqueMov) => (!f.de || m.data >= f.de) && (!f.ate || m.data <= f.ate);
  const sub = f.de || f.ate ? ` · período ${f.de ? fmtData(f.de) : 'início'} a ${f.ate ? fmtData(f.ate) : 'hoje'}` : '';
  const ordP = [...d.produtos].sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR') || ordenarPorNome(a, b));
  const linhaProd = (p: EstoqueProduto) => ({
    p: p.nome, cat: p.categoria, tipo: TIPOS_PRODUTO[p.tipo], meta: p.meta, at: estoqueAtual(d, p), disp: estoqueDisponivel(d, p),
    un: p.unidade, min: p.minimo, rep: reposicao(d, p), st: STATUS_LABEL[statusProduto(d, p)], loc: local(p.local_id),
    pu: r2(precoUnitario(d, p)), custo: r2(reposicao(d, p) * precoUnitario(d, p)), vest: r2(soma(lotesDoProduto(d, p.id), valorEmEstoque)),
  });
  const linhaLote = (l: EstoqueLote) => {
    const p = prod(l.produto_id);
    return {
      p: p?.nome ?? '', cat: p?.categoria ?? '', lote: l.num_lote, q: l.qtd_atual, un: p?.unidade ?? '', comp: fmtData(l.data_compra),
      val: fmtData(l.validade), dias: diasAte(l.validade), sit: ALERTA_LABEL[alertaLote(l)], loc: local(l.local_id), forn: l.fornecedor, v: r2(valorEmEstoque(l)),
    };
  };
  const colLote: ColunaRel[] = [
    { titulo: 'Produto', chave: 'p' }, { titulo: 'Categoria', chave: 'cat' }, { titulo: 'Lote', chave: 'lote' }, { titulo: 'Qtd. atual', chave: 'q', tipo: 'num' },
    { titulo: 'Un.', chave: 'un' }, { titulo: 'Compra', chave: 'comp' }, { titulo: 'Validade', chave: 'val' }, { titulo: 'Dias p/ vencer', chave: 'dias', tipo: 'num' },
    { titulo: 'Situação', chave: 'sit' }, { titulo: 'Local', chave: 'loc' }, { titulo: 'Fornecedor', chave: 'forn' }, { titulo: 'Valor em estoque', chave: 'v', tipo: 'moeda' },
  ];
  switch (tipo) {
    case 'inventario':
      return {
        colunas: [
          { titulo: 'Produto', chave: 'p' }, { titulo: 'Categoria', chave: 'cat' }, { titulo: 'Tipo', chave: 'tipo' }, { titulo: 'Meta', chave: 'meta', tipo: 'num' },
          { titulo: 'Atual', chave: 'at', tipo: 'num' }, { titulo: 'Disponível', chave: 'disp', tipo: 'num' }, { titulo: 'Un.', chave: 'un' },
          { titulo: 'Mín. seg.', chave: 'min', tipo: 'num' }, { titulo: 'Repor', chave: 'rep', tipo: 'num' }, { titulo: 'Status', chave: 'st' },
          { titulo: 'Local', chave: 'loc' }, { titulo: 'Valor em estoque', chave: 'vest', tipo: 'moeda' },
        ],
        linhas: ordP.map(linhaProd),
        totais: ['vest'],
      };
    case 'abaixo':
    case 'reposicao': {
      const lista = tipo === 'abaixo' ? ordP : [...d.produtos].sort((a, b) => percentualMeta(d, a) - percentualMeta(d, b));
      return {
        colunas: [
          { titulo: 'Produto', chave: 'p' }, { titulo: 'Categoria', chave: 'cat' }, { titulo: 'Meta', chave: 'meta', tipo: 'num' }, { titulo: 'Atual', chave: 'at', tipo: 'num' },
          { titulo: 'Comprar', chave: 'rep', tipo: 'num' }, { titulo: 'Un.', chave: 'un' }, { titulo: 'Status', chave: 'st' },
          { titulo: 'Preço un. est.', chave: 'pu', tipo: 'moeda' }, { titulo: 'Custo estimado', chave: 'custo', tipo: 'moeda' },
        ],
        linhas: lista.filter((p) => p.meta > 0 && reposicao(d, p) > 0).map(linhaProd),
        totais: ['custo'],
      };
    }
    case 'vencendo':
      return { colunas: colLote, linhas: d.lotes.filter((l) => l.qtd_atual > 0 && ['d30', 'd60', 'd90'].includes(alertaLote(l))).sort(ordemFEFO).map(linhaLote) };
    case 'vencidos':
      return { colunas: colLote, linhas: d.lotes.filter((l) => l.qtd_atual > 0 && alertaLote(l) === 'venc').sort(ordemFEFO).map(linhaLote), totais: ['v'] };
    case 'agua': {
      const ids = d.produtos.filter((p) => p.tipo === 'agua').map((p) => p.id);
      return {
        colunas: [
          { titulo: 'Lote', chave: 'lote' }, { titulo: 'Capacidade (L)', chave: 'cap', tipo: 'num' }, { titulo: 'Garrafas', chave: 'g', tipo: 'num' },
          { titulo: 'Litros', chave: 'q', tipo: 'num' }, { titulo: 'Compra', chave: 'comp' }, { titulo: 'Validade', chave: 'val' },
          { titulo: 'Situação', chave: 'sit' }, { titulo: 'Local', chave: 'loc' }, { titulo: 'Fornecedor', chave: 'forn' },
        ],
        linhas: d.lotes
          .filter((l) => ids.includes(l.produto_id) && l.qtd_atual > 0)
          .sort(ordemFEFO)
          .map((l) => ({ ...linhaLote(l), cap: l.cap || 5, g: r2(l.qtd_atual / (l.cap || 5)) })),
        totais: ['q', 'g'],
      };
    }
    case 'compras':
      return {
        sub,
        colunas: [
          { titulo: 'Data', chave: 'd' }, { titulo: 'Tipo', chave: 't' }, { titulo: 'Produto', chave: 'p' }, { titulo: 'Categoria', chave: 'cat' },
          { titulo: 'Quantidade', chave: 'q', tipo: 'num' }, { titulo: 'Un.', chave: 'un' }, { titulo: 'Valor pago', chave: 'v', tipo: 'moeda' },
          { titulo: 'Preço unitário', chave: 'pu', tipo: 'moeda' }, { titulo: 'Fornecedor', chave: 'forn' }, { titulo: 'Lote', chave: 'lote' },
          { titulo: 'Validade', chave: 'val' }, { titulo: 'Local', chave: 'loc' },
        ],
        linhas: compras(d)
          .filter(noPeriodo)
          .sort((a, b) => b.data.localeCompare(a.data))
          .map((m) => {
            const p = prod(m.produto_id);
            const l = d.lotes.find((x) => x.id === m.lote_id);
            return {
              d: fmtData(m.data), t: TIPOS_MOV[m.tipo], p: p?.nome ?? '', cat: p?.categoria ?? '', q: m.qtd, un: p?.unidade ?? '', v: m.valor,
              pu: m.qtd ? r2(m.valor / m.qtd) : 0, forn: l?.fornecedor ?? '', lote: l?.num_lote ?? '', val: fmtData(l?.validade), loc: local(l?.local_id ?? null),
            };
          }),
        totais: ['v'],
      };
    case 'consumo':
      return {
        sub,
        colunas: [
          { titulo: 'Data', chave: 'd' }, { titulo: 'Tipo', chave: 't' }, { titulo: 'Produto', chave: 'p' }, { titulo: 'Lote', chave: 'lote' },
          { titulo: 'Quantidade', chave: 'q', tipo: 'num' }, { titulo: 'Un.', chave: 'un' }, { titulo: 'Valor estimado', chave: 'v', tipo: 'moeda' },
          { titulo: 'Observações', chave: 'o' },
        ],
        linhas: movsAtivas(d, [...SAIDAS, 'ajuste'])
          .filter(noPeriodo)
          .sort((a, b) => b.data.localeCompare(a.data))
          .map((m) => {
            const p = prod(m.produto_id);
            const l = d.lotes.find((x) => x.id === m.lote_id);
            return { d: fmtData(m.data), t: TIPOS_MOV[m.tipo], p: p?.nome ?? '', lote: l?.num_lote ?? '', q: m.tipo === 'ajuste' ? m.qtd : -m.qtd, un: p?.unidade ?? '', v: Math.abs(m.valor), o: m.obs };
          }),
        totais: ['v'],
      };

  }
}

/** Mensagens amigáveis para os erros levantados pelas funções do banco. */
export function mensagemErro(e: { message?: string } | null | undefined): string {
  const m = e?.message || '';
  if (m.includes('ESTOQUE_INSUFICIENTE')) return 'Estoque insuficiente para esta saída.';
  if (m.includes('LOTE_COM_SAIDAS')) return 'Este lote já teve saídas ou ajustes. Estorne essas movimentações primeiro.';
  if (m.includes('VALIDADE_ANTES_FABRICACAO')) return 'A validade deve ser posterior à data de fabricação.';
  if (m.includes('QUANTIDADE_INVALIDA')) return 'Quantidade inválida.';
  if (m.includes('PRODUTO_INVALIDO')) return 'Produto não encontrado.';
  if (m.includes('LOTE_INVALIDO') || m.includes('LOTE_INEXISTENTE')) return 'Lote não encontrado.';
  if (m.includes('MOV_INVALIDA')) return 'Movimentação não encontrada ou já estornada.';
  if (m.includes('SEM_FAMILIA')) return 'Seu usuário não está vinculado a uma família.';
  if (m.includes('BACKUP_INVALIDO')) return 'Arquivo não reconhecido como backup do estoque.';
  if (m.includes('estoque_produtos_nome_uk')) return 'Já existe um produto com esse nome.';
  if (m.includes('estoque_locais_nome_uk')) return 'Já existe um local com esse nome.';
  if (m.includes('Failed to fetch') || m.includes('NetworkError')) return 'Sem conexão com a internet. Tente novamente.';
  return m || 'Não foi possível concluir a operação.';
}
