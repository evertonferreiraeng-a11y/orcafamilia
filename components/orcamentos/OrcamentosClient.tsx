'use client';

import { useMemo } from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { OrcamentoInlineInput } from '@/components/orcamentos/OrcamentoInlineInput';
import { OrcamentoTendenciaChart, type PontoTendencia } from '@/components/orcamentos/OrcamentoTendenciaChart';
import { IconTrendUp, IconTrendDown, IconAlerta } from '@/components/icons';
import { cn, formatCurrency, formatPercent, calcularVariacaoPercentual } from '@/lib/utils';

export interface SubcategoriaOrcamento {
  id: string;
  nome: string;
  valorLimite: number | null;
  gasto: number;
  gastoAnterior: number;
}

export interface CategoriaOrcamento {
  id: string;
  nome: string;
  cor: string | null;
  valorLimite: number | null;
  gasto: number;
  gastoAnterior: number;
  subcategorias: SubcategoriaOrcamento[];
}

function BadgeComparacao({ atual, anterior }: { atual: number; anterior: number }) {
  const variacao = calcularVariacaoPercentual(atual, anterior);
  if (variacao === null) return null;
  const piorou = variacao > 0;
  const Icone = piorou ? IconTrendUp : IconTrendDown;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        piorou ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'
      )}
      title="Comparado ao mês anterior"
    >
      <Icone className="h-3 w-3" />
      {formatPercent(variacao)}
    </span>
  );
}

function LinhaProgresso({
  percentual,
  gasto,
  valorLimite,
}: {
  percentual: number;
  gasto: number;
  valorLimite: number | null;
}) {
  const estourado = percentual >= 100;
  const alerta = percentual >= 80;
  return (
    <>
      <div className="mt-2">
        <ProgressBar percentual={percentual} />
      </div>
      <p
        className={cn(
          'mt-1.5 flex items-center gap-1 text-xs font-medium',
          estourado ? 'text-negative' : alerta ? 'text-amber-600' : 'text-gray-400'
        )}
      >
        {(estourado || alerta) && <IconAlerta className="h-3 w-3" />}
        {valorLimite ? `${formatCurrency(gasto)} de ${formatCurrency(valorLimite)} (${percentual.toFixed(0)}%)` : `${formatCurrency(gasto)} gasto`}
        {estourado ? ' — estourado' : alerta ? ' — quase no limite' : ''}
      </p>
    </>
  );
}

export function OrcamentosClient({
  categorias,
  mesReferencia,
  tendencia,
}: {
  categorias: CategoriaOrcamento[];
  mesReferencia: string;
  tendencia: PontoTendencia[];
}) {
  const { totalOrcado, totalGasto } = useMemo(() => {
    return categorias.reduce(
      (acc, c) => ({
        totalOrcado: acc.totalOrcado + (c.valorLimite ?? 0),
        totalGasto: acc.totalGasto + c.gasto,
      }),
      { totalOrcado: 0, totalGasto: 0 }
    );
  }, [categorias]);

  const percentualGeral = totalOrcado > 0 ? (totalGasto / totalOrcado) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-500">Total planejado</p>
          <p className="mt-2 text-xl font-bold text-gray-900">{formatCurrency(totalOrcado)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-500">Total gasto no mês</p>
          <p className={cn('mt-2 text-xl font-bold', percentualGeral >= 100 ? 'text-negative' : 'text-gray-900')}>
            {formatCurrency(totalGasto)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-500">% do planejado usado</p>
          <p className={cn('mt-2 text-xl font-bold', percentualGeral >= 100 ? 'text-negative' : percentualGeral >= 80 ? 'text-amber-600' : 'text-positive')}>
            {percentualGeral.toFixed(0)}%
          </p>
        </div>
      </div>

      <OrcamentoTendenciaChart dados={tendencia} />

      <div className="space-y-3">
        {categorias.map((c) => {
          const percentual = c.valorLimite ? (c.gasto / c.valorLimite) * 100 : 0;
          return (
            <div key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${c.cor ?? '#888888'}1a`, color: c.cor ?? '#888888' }}
                >
                  {c.nome}
                </span>
                <BadgeComparacao atual={c.gasto} anterior={c.gastoAnterior} />
              </div>

              <div className="mt-3 flex items-end gap-3">
                <div className="w-32 shrink-0">
                  <label className="mb-1 block text-xs text-gray-400">Orçado</label>
                  <OrcamentoInlineInput
                    categoriaId={c.id}
                    subcategoriaId={null}
                    mesReferencia={mesReferencia}
                    valorInicial={c.valorLimite}
                  />
                </div>
                <div className="flex-1">
                  <LinhaProgresso percentual={percentual} gasto={c.gasto} valorLimite={c.valorLimite} />
                </div>
              </div>

              {c.subcategorias.length > 0 && (
                <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
                  {c.subcategorias.map((s) => {
                    const percentualSub = s.valorLimite ? (s.gasto / s.valorLimite) * 100 : 0;
                    return (
                      <div key={s.id} className="flex flex-wrap items-end gap-3 pl-3">
                        <div className="w-full text-xs font-medium text-gray-500 sm:hidden">{s.nome}</div>
                        <div className="hidden w-32 shrink-0 text-sm text-gray-600 sm:block">{s.nome}</div>
                        <div className="w-28 shrink-0">
                          <OrcamentoInlineInput
                            categoriaId={c.id}
                            subcategoriaId={s.id}
                            mesReferencia={mesReferencia}
                            valorInicial={s.valorLimite}
                          />
                        </div>
                        <div className="flex-1">
                          <LinhaProgresso percentual={percentualSub} gasto={s.gasto} valorLimite={s.valorLimite} />
                        </div>
                        <BadgeComparacao atual={s.gasto} anterior={s.gastoAnterior} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
