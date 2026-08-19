interface RegraPercentualRenda {
  padrao: RegExp;
  percentual: number;
}

/**
 * Percentuais de referência (% da renda mensal) usados como ponto de partida
 * para sugerir orçamentos por categoria, baseado em diretrizes comuns de
 * planejamento financeiro pessoal. Categorias que não casam com nenhum
 * padrão recebem PERCENTUAL_GENERICO.
 */
const REGRAS_PERCENTUAL_RENDA: RegraPercentualRenda[] = [
  { padrao: /moradia|aluguel|financiamento|condom[íi]nio/i, percentual: 0.28 },
  { padrao: /alimenta|mercado|supermercado/i, percentual: 0.15 },
  { padrao: /transporte|carro|combust[íi]vel|uber/i, percentual: 0.1 },
  { padrao: /sa[úu]de/i, percentual: 0.06 },
  { padrao: /educa[çc][ãa]o/i, percentual: 0.05 },
  { padrao: /lazer/i, percentual: 0.06 },
  { padrao: /vestu[áa]rio|roupa/i, percentual: 0.04 },
  { padrao: /cuidados pessoais|beleza|est[ée]tica/i, percentual: 0.03 },
  { padrao: /d[íi]vida/i, percentual: 0.1 },
  { padrao: /presente|doa[çc][ãa]o/i, percentual: 0.02 },
  { padrao: /assinatura|streaming/i, percentual: 0.02 },
  { padrao: /pet|animal/i, percentual: 0.02 },
];

const PERCENTUAL_GENERICO = 0.03;

export function percentualSugeridoRenda(nomeCategoria: string): number {
  const regra = REGRAS_PERCENTUAL_RENDA.find((r) => r.padrao.test(nomeCategoria));
  return regra ? regra.percentual : PERCENTUAL_GENERICO;
}

export function valorOrcamentoSugerido(nomeCategoria: string, rendaBase: number): number {
  return Math.round(rendaBase * percentualSugeridoRenda(nomeCategoria) * 100) / 100;
}
