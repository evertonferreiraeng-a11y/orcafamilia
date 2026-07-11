'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { addMeses, parseMesParam } from '@/lib/utils';

const MESES_NOME = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function paramMes(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

export function useMesSelecionado(): Date {
  const searchParams = useSearchParams();
  return parseMesParam(searchParams.get('mes') ?? undefined);
}

export function MonthPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mesAtual = parseMesParam(searchParams.get('mes') ?? undefined);

  function irPara(data: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mes', paramMes(data));
    router.push(`${pathname}?${params.toString()}`);
  }

  const anoAtualCalendario = new Date().getFullYear();
  const anosDisponiveis = Array.from({ length: 9 }, (_, i) => anoAtualCalendario - 5 + i);
  if (!anosDisponiveis.includes(mesAtual.getFullYear())) anosDisponiveis.unshift(mesAtual.getFullYear());
  anosDisponiveis.sort((a, b) => b - a);

  return (
    <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-1 py-1">
      <button
        type="button"
        onClick={() => irPara(addMeses(mesAtual, -1))}
        className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100"
        aria-label="Mês anterior"
      >
        ‹
      </button>
      <select
        value={mesAtual.getMonth()}
        onChange={(e) => irPara(new Date(mesAtual.getFullYear(), Number(e.target.value), 1))}
        aria-label="Selecionar mês"
        className="rounded-lg border-0 bg-transparent px-1 py-1 text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {MESES_NOME.map((nome, i) => (
          <option key={nome} value={i}>
            {nome}
          </option>
        ))}
      </select>
      <select
        value={mesAtual.getFullYear()}
        onChange={(e) => irPara(new Date(Number(e.target.value), mesAtual.getMonth(), 1))}
        aria-label="Selecionar ano"
        className="rounded-lg border-0 bg-transparent px-1 py-1 text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {anosDisponiveis.map((ano) => (
          <option key={ano} value={ano}>
            {ano}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => irPara(addMeses(mesAtual, 1))}
        className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100"
        aria-label="Próximo mês"
      >
        ›
      </button>
    </div>
  );
}
