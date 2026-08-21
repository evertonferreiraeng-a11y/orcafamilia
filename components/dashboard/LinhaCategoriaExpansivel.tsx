'use client';

import { useState } from 'react';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { cn, formatPercent0 } from '@/lib/utils';
import { IconChevronDown, IconChevronRight } from '@/components/icons';
import type { CategoriaExecutadoOrcado } from './DespesasPorTipoCard';

const CINZA_PADRAO = '#94a3b8';
const TOLERANCIA = 0.01;

function LinhaValores({
  executado,
  orcado,
  totalGeral,
  destaque = false,
}: {
  executado: number;
  orcado: number;
  totalGeral: number;
  destaque?: boolean;
}) {
  const acimaDoOrcado = orcado > 0 && executado > orcado + TOLERANCIA;
  const percentualOrcado = orcado > 0 ? (executado / orcado) * 100 : null;
  const percentualGeral = totalGeral > 0 ? (executado / totalGeral) * 100 : null;

  return (
    <>
      <span
        className={cn(
          'w-24 shrink-0 text-right text-sm',
          destaque ? 'font-semibold' : 'font-medium',
          acimaDoOrcado ? 'text-negative' : destaque ? 'text-gray-900' : 'text-gray-700'
        )}
      >
        <ValorMonetario valor={executado} />
      </span>
      <span className="w-24 shrink-0 text-right text-sm text-gray-500">
        {orcado > 0 ? <ValorMonetario valor={orcado} /> : '—'}
      </span>
      <span
        className={cn(
          'w-16 shrink-0 text-center text-xs font-semibold',
          percentualOrcado === null ? 'text-gray-400' : acimaDoOrcado ? 'text-negative' : 'text-gray-500'
        )}
      >
        {percentualOrcado !== null ? formatPercent0(percentualOrcado) : '—'}
      </span>
      <span className="w-16 shrink-0 text-center text-xs font-medium text-gray-400">
        {percentualGeral !== null ? formatPercent0(percentualGeral) : '—'}
      </span>
    </>
  );
}

export function LinhaCategoriaExpansivel({
  categoria,
  totalGeral,
}: {
  categoria: CategoriaExecutadoOrcado;
  totalGeral: number;
}) {
  const [aberta, setAberta] = useState(false);
  const cor = categoria.cor ?? CINZA_PADRAO;
  const temSubcategorias = (categoria.subcategorias?.length ?? 0) > 0;
  const subcategoriasOrdenadas = [...(categoria.subcategorias ?? [])].sort((a, b) => b.executado - a.executado);

  return (
    <div>
      <button
        type="button"
        onClick={() => temSubcategorias && setAberta((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 py-2.5 text-left',
          temSubcategorias && 'cursor-pointer hover:bg-gray-50'
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
          {temSubcategorias ? (
            aberta ? (
              <IconChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <IconChevronRight className="h-4 w-4 text-gray-400" />
            )
          ) : (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
              style={{ backgroundColor: `${cor}22` }}
            >
              {categoria.icone ?? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor }} />}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{categoria.nome}</span>
        <LinhaValores executado={categoria.executado} orcado={categoria.orcado} totalGeral={totalGeral} destaque />
      </button>

      {temSubcategorias && aberta && (
        <div className="ml-8 border-l border-gray-100 pl-3">
          {subcategoriasOrdenadas.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-2">
              <span className="w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-600">{s.nome}</span>
              <LinhaValores executado={s.executado} orcado={s.orcado} totalGeral={totalGeral} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
