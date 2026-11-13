'use client';

import { useEffect, useRef, useState } from 'react';
import { useSaldoVisibilidade } from '@/components/layout/SaldoVisibilidadeContext';
import { formatCurrency } from '@/lib/utils';

/** Valor em R$ que "conta" até o número ao aparecer. Respeita o olho de ocultar saldos. */
export function ValorAnimado({ valor, duracao = 900 }: { valor: number; duracao?: number }) {
  const { visivel } = useSaldoVisibilidade();
  const [mostrado, setMostrado] = useState(0);
  const anterior = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setMostrado(valor);
      anterior.current = valor;
      return;
    }
    const de = anterior.current;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const suave = 1 - Math.pow(1 - t, 3);
      setMostrado(de + (valor - de) * suave);
      if (t < 1) quadro = requestAnimationFrame(passo);
      else anterior.current = valor;
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, duracao]);

  return <>{visivel ? formatCurrency(mostrado) : '••••••'}</>;
}
