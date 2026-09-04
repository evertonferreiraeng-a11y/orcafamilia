'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { addMeses, parseMesParam } from '@/lib/utils';
import { IconChevronLeft, IconChevronRight, IconAtualizar } from '@/components/icons';

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

  const hoje = new Date();
  const noMesAtual = mesAtual.getFullYear() === hoje.getFullYear() && mesAtual.getMonth() === hoje.getMonth();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-1 py-1">
        <button
          type="button"
          onClick={() => irPara(addMeses(mesAtual, -1))}
          className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Mês anterior"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        <select
          value={mesAtual.getMonth()}
          onChange={(e) => irPara(new Date(mesAtual.getFullYear(), Number(e.target.value), 1))}
          aria-label="Selecionar mês"
          className="rounded-full border-0 bg-transparent px-1 py-1 text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
          className="rounded-full border-0 bg-transparent px-1 py-1 text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
          className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Próximo mês"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => irPara(new Date(hoje.getFullYear(), hoje.getMonth(), 1))}
        disabled={noMesAtual}
        className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-default disabled:border-brand-200 disabled:bg-brand-50 disabled:text-brand-600"
      >
        Hoje
      </button>

      <button
        type="button"
        onClick={() => router.refresh()}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
      >
        <IconAtualizar className="h-4 w-4" />
        Atualizar
      </button>
    </div>
  );
}
