'use client';

import { useEffect, useState } from 'react';

/** Anel da nota de saúde financeira (0–100) que enche e conta ao aparecer. */
export function NotaAnimada({ nota, cor, tamanho = 112 }: { nota: number; cor: string; tamanho?: number }) {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValor(nota);
      return;
    }
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / 1100);
      setValor(nota * (1 - Math.pow(1 - t, 3)));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [nota]);

  const esp = 11;
  const r = (tamanho - esp) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      <svg viewBox={`0 0 ${tamanho} ${tamanho}`} className="h-full w-full -rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth={esp} />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          stroke={cor}
          strokeWidth={esp}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, valor)) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{Math.round(valor)}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/75">de 100</span>
      </div>
    </div>
  );
}
