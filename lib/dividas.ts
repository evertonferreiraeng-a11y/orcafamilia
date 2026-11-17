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

/** % de desconto do valor com desconto sobre o valor com juros. */
export function percentualDesconto(comJuros: number | null | undefined, comDesconto: number | null | undefined): number | null {
  if (comJuros == null || comDesconto == null || Number(comJuros) <= 0 || Number(comDesconto) >= Number(comJuros)) return null;
  return (1 - Number(comDesconto) / Number(comJuros)) * 100;
}

/** Valores de negociação de uma dívida: com juros (o valor da dívida) e com desconto. */
export function valoresNegociacao(d: {
  valor_total: number;
  valor_atual?: number | null;
  valor_com_desconto?: number | null;
  desconto_pct?: number | null;
}): { comJuros: number; comDesconto: number | null; pct: number | null } {
  const comJuros = d.valor_atual != null ? Number(d.valor_atual) : Number(d.valor_total);
  const comDesconto =
    d.valor_com_desconto != null
      ? Number(d.valor_com_desconto)
      : d.desconto_pct != null && Number(d.desconto_pct) > 0
      ? Math.round(comJuros * (1 - Number(d.desconto_pct) / 100) * 100) / 100
      : null;
  return { comJuros, comDesconto, pct: percentualDesconto(comJuros, comDesconto) };
}
