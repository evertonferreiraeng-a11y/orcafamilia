'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ResultadoFinanceiroReport } from '@/components/indicadores/ResultadoFinanceiroReport';
import { EvolucaoContasReport } from '@/components/indicadores/EvolucaoContasReport';
import { cn } from '@/lib/utils';

export interface PontoMes {
  label: string;
  receita: number;
  despesa: number;
  resultado: number;
  percentualLucro: number;
  percentualGasto: number;
}

export interface SubcategoriaEvolucao {
  id: string;
  nome: string;
  realizadoPorMes: number[];
}

export interface CategoriaEvolucao {
  id: string;
  nome: string;
  realizadoPorMes: number[];
  orcadoPorMes: number[];
  subcategorias: SubcategoriaEvolucao[];
}

type Aba = 'resultado' | 'evolucao';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'resultado', label: 'Resultado Financeiro' },
  { id: 'evolucao', label: 'Evolução das Contas' },
];

export function IndicadoresClient({
  ano,
  pontosAno,
  categoriasReceitaEvolucao,
  categoriasDespesaEvolucao,
}: {
  ano: number;
  pontosAno: PontoMes[];
  categoriasReceitaEvolucao: CategoriaEvolucao[];
  categoriasDespesaEvolucao: CategoriaEvolucao[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [aba, setAba] = useState<Aba>('resultado');

  function mudarAno(novoAno: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('ano', String(novoAno));
    router.push(`${pathname}?${params.toString()}`);
  }

  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = Array.from({ length: 6 }, (_, i) => anoAtual - i);
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

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-1">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAba(item.id)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              aba === item.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {aba === 'resultado' && <ResultadoFinanceiroReport pontosAno={pontosAno} />}
      {aba === 'evolucao' && (
        <EvolucaoContasReport
          categoriasReceita={categoriasReceitaEvolucao}
          categoriasDespesa={categoriasDespesaEvolucao}
        />
      )}
    </div>
  );
}
