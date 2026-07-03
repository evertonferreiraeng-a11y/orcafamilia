'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Categoria, Conta } from '@/types/database';

export function FiltrosTransacoes({ categorias, contas }: { categorias: Categoria[]; contas: Conta[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function atualizar(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set(chave, valor);
    else params.delete(chave);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        className="input-field w-auto"
        defaultValue={searchParams.get('tipo') ?? ''}
        onChange={(e) => atualizar('tipo', e.target.value)}
      >
        <option value="">Todos os tipos</option>
        <option value="receita">Receita</option>
        <option value="despesa">Despesa</option>
      </select>

      <select
        className="input-field w-auto"
        defaultValue={searchParams.get('categoria') ?? ''}
        onChange={(e) => atualizar('categoria', e.target.value)}
      >
        <option value="">Todas as categorias</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      <select
        className="input-field w-auto"
        defaultValue={searchParams.get('conta') ?? ''}
        onChange={(e) => atualizar('conta', e.target.value)}
      >
        <option value="">Todas as contas</option>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>
    </div>
  );
}
