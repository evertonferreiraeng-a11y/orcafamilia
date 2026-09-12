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
  isReceita = false,
}: {
  executado: number;
  orcado: number;
  totalGeral: number;
  destaque?: boolean;
  isReceita?: boolean;
}) {
  const acimaDoOrcado = orcado > 0 && executado > orcado + TOLERANCIA;
  const corDestaque = isReceita ? 'text-positive' : 'text-negative';
  const percentualOrcado = orcado > 0 ? (executado / orcado) * 100 : null;
  const percentualGeral = totalGeral > 0 ? (executado / totalGeral) * 100 : null;

  return (
    <>
      <span
        className={cn(
          'w-16 shrink-0 text-right text-sm sm:w-24',
          destaque ? 'font-semibold' : 'font-medium',
          acimaDoOrcado ? corDestaque : destaque ? 'text-gray-900' : 'text-gray-700'
        )}
      >
        <ValorMonetario valor={executado} />
      </span>
      <span className="w-16 shrink-0 text-right text-sm text-gray-500 sm:w-24">
        {orcado > 0 ? <ValorMonetario valor={orcado} /> : '—'}
      </span>
      <span
        className={cn(
          'w-12 shrink-0 text-center text-xs font-semibold sm:w-16',
          percentualOrcado === null ? 'text-gray-400' : acimaDoOrcado ? corDestaque : 'text-gray-500'
        )}
      >
        {percentualOrcado !== null ? formatPercent0(percentualOrcado) : '—'}
      </span>
      <span className="hidden w-16 shrink-0 text-center text-xs font-medium text-gray-400 sm:block">
        {percentualGeral !== null ? formatPercent0(percentualGeral) : '—'}
      </span>
    </>
  );
}

export function LinhaCategoriaExpansivel({
  categoria,
  totalGeral,
  isReceita = false,
}: {
  categoria: CategoriaExecutadoOrcado;
  totalGeral: number;
  isReceita?: boolean;
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
          'flex w-full items-center gap-2 rounded-lg px-1 py-2.5 text-left transition-colors sm:gap-3',
          temSubcategorias && 'cursor-pointer hover:bg-gray-200'
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
        <LinhaValores
          executado={categoria.executado}
          orcado={categoria.orcado}
          totalGeral={totalGeral}
          destaque
          isReceita={isReceita}
        />
      </button>

      {temSubcategorias && aberta && (
        <div className="ml-8 border-l border-gray-100 pl-3">
          {subcategoriasOrdenadas.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-lg px-1 py-2 transition-colors hover:bg-gray-200 sm:gap-3"
            >
              <span className="w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-600">{s.nome}</span>
              <LinhaValores executado={s.executado} orcado={s.orcado} totalGeral={totalGeral} isReceita={isReceita} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
