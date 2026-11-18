import type { JpCompra } from '@/types/database';

export const CATEGORIAS_COMPRAS = ['Carnes', 'Acompanhamentos', 'Bebidas', 'Descartáveis', 'Doces e bolo', 'Decoração', 'Brindes', 'Igreja', 'Outros'];
export const UNIDADES_COMPRAS = ['un', 'kg', 'g', 'L', 'pct', 'cx', 'fardo', 'dz'];

const n = (v: unknown) => Number(v) || 0;

/** Valor previsto do item = quantidade × valor unitário. */
export const previstoItem = (c: Pick<JpCompra, 'quantidade' | 'valor_unitario'>) => Math.round(n(c.quantidade) * n(c.valor_unitario) * 100) / 100;
/** Valor real: o pago, se informado; senão, o previsto. */
export const realItem = (c: Pick<JpCompra, 'quantidade' | 'valor_unitario' | 'valor_pago'>) => (c.valor_pago === null || c.valor_pago === undefined ? previstoItem(c) : n(c.valor_pago));

export type ResumoCompras = {
  itens: number;
  comprados: number;
  faltam: number;
  previsto: number; // soma do previsto de todos os itens
  gasto: number; // gasto real dos itens comprados
  faltaGastar: number; // previsto dos itens que faltam
  totalEstimado: number; // gasto + faltaGastar
};

export function resumoCompras(lista: JpCompra[]): ResumoCompras {
  const comprados = lista.filter((c) => c.comprado);
  const faltam = lista.filter((c) => !c.comprado);
  const soma = (l: JpCompra[], f: (c: JpCompra) => number) => Math.round(l.reduce((s, c) => s + f(c), 0) * 100) / 100;
  const gasto = soma(comprados, realItem);
  const faltaGastar = soma(faltam, previstoItem);
  return {
    itens: lista.length,
    comprados: comprados.length,
    faltam: faltam.length,
    previsto: soma(lista, previstoItem),
    gasto,
    faltaGastar,
    totalEstimado: Math.round((gasto + faltaGastar) * 100) / 100,
  };
}

export const fmtQtd = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
