'use client';

import { useSaldoVisibilidade } from '@/components/layout/SaldoVisibilidadeContext';
import { formatCurrency } from '@/lib/utils';

export function ValorMonetario({ valor }: { valor: number }) {
  const { visivel } = useSaldoVisibilidade();
  return <>{visivel ? formatCurrency(valor) : '••••••'}</>;
}
