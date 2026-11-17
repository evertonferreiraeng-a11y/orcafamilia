/** Rótulos e cálculos dos detalhes de negociação das dívidas (migração 0026). */

export const TIPOS_DIVIDA = {
  cartao_credito: { rotulo: 'Cartão de crédito', emoji: '💳' },
  limite_conta: { rotulo: 'Limite da conta (cheque especial)', emoji: '🏦' },
  emprestimo: { rotulo: 'Empréstimo pessoal', emoji: '💵' },
  consignado: { rotulo: 'Consignado', emoji: '🧾' },
  financiamento: { rotulo: 'Financiamento', emoji: '🚗' },
  crediario: { rotulo: 'Crediário / carnê', emoji: '🛍️' },
  acordo: { rotulo: 'Acordo / renegociação', emoji: '🤝' },
  outros: { rotulo: 'Outros', emoji: '📄' },
} as const;
export type TipoDivida = keyof typeof TIPOS_DIVIDA;

export const SITUACOES_CREDITO = {
  em_dia: { rotulo: 'Em dia', estilo: 'bg-emerald-50 text-emerald-700' },
  atrasada: { rotulo: 'Atrasada', estilo: 'bg-amber-50 text-amber-700' },
  negativada: { rotulo: 'Negativada', estilo: 'bg-red-100 text-red-700' },
  protestada: { rotulo: 'Protestada', estilo: 'bg-red-100 text-red-700' },
  cobranca_judicial: { rotulo: 'Cobrança judicial', estilo: 'bg-red-200 text-red-800' },
  em_acordo: { rotulo: 'Em acordo', estilo: 'bg-brand-50 text-brand-700' },
} as const;
export type SituacaoCredito = keyof typeof SITUACOES_CREDITO;

export function rotuloTipo(t: string | null | undefined): string | null {
  return t && t in TIPOS_DIVIDA ? TIPOS_DIVIDA[t as TipoDivida].rotulo : null;
}
export function rotuloSituacaoCredito(s: string | null | undefined): string | null {
  return s && s in SITUACOES_CREDITO ? SITUACOES_CREDITO[s as SituacaoCredito].rotulo : null;
}

/** Valor para quitar com o desconto informado (sobre o valor atual). */
export function valorComDesconto(valorAtual: number | null | undefined, descontoPct: number | null | undefined): number | null {
  if (valorAtual == null || descontoPct == null || descontoPct <= 0) return null;
  return Math.round(Number(valorAtual) * (1 - Number(descontoPct) / 100) * 100) / 100;
}

/** Quanto a dívida cresceu (+) ou caiu (−) do valor original para o atual, em %. */
export function variacaoOriginalAtual(original: number | null | undefined, atual: number | null | undefined): number | null {
  if (original == null || atual == null || Number(original) <= 0) return null;
  return ((Number(atual) - Number(original)) / Number(original)) * 100;
}
