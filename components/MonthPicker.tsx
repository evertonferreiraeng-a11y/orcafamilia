'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { addMeses, nomeMes, parseMesParam } from '@/lib/utils';

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
      <span className="min-w-[9rem] px-1 text-center text-sm font-medium capitalize text-gray-700">
        {nomeMes(mesAtual)}
      </span>
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
