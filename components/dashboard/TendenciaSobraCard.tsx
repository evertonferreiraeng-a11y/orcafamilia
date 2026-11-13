'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { cn } from '@/lib/utils';

export interface PontoTendencia {
  mesParam: string; // yyyy-MM
  rotulo: string; // "Dez" ou "Dez/25"
  receita: number;
  despesa: number;
}

/** Sobra (receita − despesa) dos últimos meses. Clique na barra abre aquele mês. */
export function TendenciaSobraCard({ pontos, mesAtual }: { pontos: PontoTendencia[]; mesAtual: string }) {
  const router = useRouter();
  const [foco, setFoco] = useState<string | null>(null);
  const dados = pontos.map((p) => ({ ...p, sobra: p.receita - p.despesa, vazio: p.receita === 0 && p.despesa === 0 }));
  const comDados = dados.filter((d) => !d.vazio);
  const max = Math.max(1, ...dados.map((d) => Math.abs(d.sobra)));
  const media = comDados.length ? comDados.reduce((a, d) => a + d.sobra, 0) / comDados.length : 0;
  const temNegativo = dados.some((d) => d.sobra < 0);
  const sel = dados.find((d) => d.mesParam === (foco ?? mesAtual));

  // Tendência: compara a média da metade mais recente com a mais antiga.
  let tendencia: string | null = null;
  if (comDados.length >= 3) {
    const meio = Math.floor(comDados.length / 2);
    const antiga = comDados.slice(0, meio).reduce((a, d) => a + d.sobra, 0) / meio;
    const recente = comDados.slice(meio).reduce((a, d) => a + d.sobra, 0) / (comDados.length - meio);
    tendencia = recente > antiga * 1.05 ? '📈 melhorando' : recente < antiga * 0.95 ? '📉 piorando' : '➡️ estável';
  }

  const ALTURA = 112;
  return (
    <div className="card flex h-full flex-col p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">📊 Sobra mês a mês</p>
        {tendencia && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{tendencia}</span>}
      </div>
      <p className="mb-3 text-xs text-gray-500">
        {sel && !sel.vazio ? (
          <>
            {sel.rotulo}: {sel.sobra >= 0 ? 'sobrou' : 'faltou'}{' '}
            <b className={sel.sobra >= 0 ? 'text-positive' : 'text-negative'}>
              <ValorMonetario valor={Math.abs(sel.sobra)} />
            </b>
            {sel.receita > 0 && ` · gastou ${Math.round((sel.despesa / sel.receita) * 100)}% do que entrou`}
          </>
        ) : (
          'Passe o mouse nas barras · clique para abrir o mês'
        )}
      </p>

      <div className="relative flex flex-1 items-end gap-2" style={{ minHeight: ALTURA + 22 }} onMouseLeave={() => setFoco(null)}>
        {temNegativo && <span aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-dashed border-gray-200" style={{ bottom: ALTURA / 2 + 20 }} />}
        {dados.map((d, i) => {
          const h = d.vazio ? 4 : Math.max(6, (Math.abs(d.sobra) / max) * (temNegativo ? ALTURA / 2 : ALTURA));
          const atual = d.mesParam === mesAtual;
          return (
            <button
              key={d.mesParam}
              type="button"
              onMouseEnter={() => setFoco(d.mesParam)}
              onClick={() => router.push(`/dashboard?mes=${d.mesParam}`)}
              className="group flex flex-1 flex-col items-center gap-1"
              title={d.vazio ? `${d.rotulo}: sem lançamentos` : `${d.rotulo}: ${d.sobra >= 0 ? 'sobrou' : 'faltou'}`}
            >
              <span className="relative flex w-full flex-col justify-end" style={{ height: ALTURA }}>
                <span
                  className={cn(
                    'anim-subir mx-auto w-full max-w-[44px] rounded-md transition group-hover:brightness-95',
                    d.vazio ? 'bg-gray-100' : d.sobra >= 0 ? 'bg-lime-500' : 'bg-red-400',
                    foco && foco !== d.mesParam && 'opacity-40',
                    atual && !foco && 'ring-2 ring-brand-300 ring-offset-1'
                  )}
                  style={{ height: h, animationDelay: `${i * 70}ms`, marginBottom: !temNegativo ? 0 : d.sobra >= 0 || d.vazio ? ALTURA / 2 : ALTURA / 2 - h }}
                />
              </span>
              <span className={cn('text-[11px]', atual ? 'font-bold text-gray-800' : 'text-gray-400')}>{d.rotulo}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500">
        {comDados.length ? (
          <>
            Sobra média: <b className={media >= 0 ? 'text-gray-800' : 'text-negative'}><ValorMonetario valor={media} /></b>/mês em {comDados.length} mês(es) com lançamentos
          </>
        ) : (
          'Ainda sem histórico suficiente'
        )}
      </p>
    </div>
  );
}
