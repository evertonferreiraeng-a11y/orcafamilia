'use client';

import { useState } from 'react';
import Link from 'next/link';
import { emojiCategoria, humorOrcamento } from '@/lib/emojiCategoria';
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
  hrefDetalhe,
}: {
  categoria: CategoriaExecutadoOrcado;
  totalGeral: number;
  isReceita?: boolean;
  hrefDetalhe?: string;
}) {
  const [aberta, setAberta] = useState(false);
  const cor = categoria.cor ?? CINZA_PADRAO;
  const temSubcategorias = (categoria.subcategorias?.length ?? 0) > 0;
  const subcategoriasOrdenadas = [...(categoria.subcategorias ?? [])].sort((a, b) => b.executado - a.executado);
  const humor = humorOrcamento({ orcado: categoria.orcado, exec: categoria.executado, receita: isReceita });

  return (
    <div>
      <div className="group flex w-full items-center gap-2 rounded-lg px-1 py-2 transition-colors hover:bg-gray-50 sm:gap-3">
        <button
          type="button"
          onClick={() => temSubcategorias && setAberta((v) => !v)}
          disabled={!temSubcategorias}
          aria-expanded={temSubcategorias ? aberta : undefined}
          aria-label={temSubcategorias ? (aberta ? 'Recolher subcategorias' : 'Ver subcategorias') : undefined}
          className={cn('flex h-8 w-4 shrink-0 items-center justify-center', temSubcategorias ? 'text-gray-400 hover:text-gray-700' : 'invisible')}
        >
          {aberta ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
        </button>
        {(() => {
          const conteudo = (
            <>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition group-hover:scale-110"
                style={{ backgroundColor: `${cor}22` }}
                aria-hidden
              >
                {emojiCategoria(categoria.nome, categoria.icone)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 group-hover:text-brand-700">{categoria.nome}</span>
              {categoria.orcado > 0 && (
                <span className="shrink-0 text-sm" title={humor.dica} aria-label={humor.dica}>
                  {humor.emoji}
                </span>
              )}
            </>
          );
          return hrefDetalhe ? (
            <Link href={hrefDetalhe} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3" title={`Abrir ${categoria.nome}`}>
              {conteudo}
            </Link>
          ) : (
            <span className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">{conteudo}</span>
          );
        })()}
        <LinhaValores
          executado={categoria.executado}
          orcado={categoria.orcado}
          totalGeral={totalGeral}
          destaque
          isReceita={isReceita}
        />
      </div>

      {temSubcategorias && aberta && (
        <div className="anim-subir ml-8 border-l border-gray-100 pl-3">
          {subcategoriasOrdenadas.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-lg px-1 py-2 transition-colors hover:bg-gray-200 sm:gap-3"
            >
              <span className="w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-600">
                <span className="mr-1.5" aria-hidden>{emojiCategoria(s.nome)}</span>
                {s.nome}
              </span>
              <LinhaValores executado={s.executado} orcado={s.orcado} totalGeral={totalGeral} isReceita={isReceita} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
