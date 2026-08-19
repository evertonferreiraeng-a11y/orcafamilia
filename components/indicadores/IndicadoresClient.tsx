'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PatrimonioLiquidoReport } from '@/components/indicadores/PatrimonioLiquidoReport';

export interface PontoPatrimonio {
  label: string;
  contas: number;
  dividas: number;
  liquido: number;
}

export function IndicadoresClient({
  ano,
  pontosPatrimonioAno,
}: {
  ano: number;
  pontosPatrimonioAno: PontoPatrimonio[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function mudarAno(novoAno: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('ano', String(novoAno));
    router.push(`${pathname}?${params.toString()}`);
  }

  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = Array.from({ length: 9 }, (_, i) => anoAtual - 5 + i);
  if (!anosDisponiveis.includes(ano)) anosDisponiveis.unshift(ano);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Indicadores</h1>
          <p className="mt-1 text-sm text-gray-500">Relatórios e evolução financeira do ano</p>
        </div>
        <select value={ano} onChange={(e) => mudarAno(Number(e.target.value))} className="input-field w-auto">
          {anosDisponiveis
            .sort((a, b) => b - a)
            .map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
        </select>
      </div>

      <PatrimonioLiquidoReport pontosPatrimonioAno={pontosPatrimonioAno} />
    </div>
  );
}
