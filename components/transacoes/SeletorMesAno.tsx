'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { parseMesParam } from '@/lib/utils';
import { cn } from '@/lib/utils';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function SeletorMesAno() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mesSelecionado = parseMesParam(searchParams.get('mes') ?? undefined);
  const ano = mesSelecionado.getFullYear();
  const mesIndex = mesSelecionado.getMonth();

  function irPara(novoAno: number, novoMesIndex: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mes', `${novoAno}-${String(novoMesIndex + 1).padStart(2, '0')}`);
    router.push(`${pathname}?${params.toString()}`);
  }

  const anos = Array.from({ length: 6 }, (_, i) => ano - 3 + i);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={ano}
        onChange={(e) => irPara(Number(e.target.value), mesIndex)}
        className="input-field w-auto"
      >
        {anos.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <div className="flex flex-wrap gap-1">
        {MESES.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => irPara(ano, i)}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
              i === mesIndex ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
