'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { IconBell, IconAlerta, IconTrendUp, IconCheck, IconChevronDown } from '@/components/icons';
import type { Insight, InsightSeveridade } from '@/lib/gerente';

const ESTILO_SEVERIDADE: Record<InsightSeveridade, { badge: string; borda: string; icon: typeof IconAlerta }> = {
  alerta: { badge: 'bg-negative/10 text-negative', borda: 'border-l-negative', icon: IconAlerta },
  aviso: { badge: 'bg-amber-100 text-amber-700', borda: 'border-l-amber-500', icon: IconAlerta },
  dica: { badge: 'bg-brand-50 text-brand-600', borda: 'border-l-brand-400', icon: IconTrendUp },
  elogio: { badge: 'bg-positive/10 text-positive', borda: 'border-l-positive', icon: IconCheck },
};

const LIMITE_VISIVEL = 3;

export function GerenteFinanceiroCard({ insights }: { insights: Insight[] }) {
  const [expandido, setExpandido] = useState(false);

  if (insights.length === 0) return null;

  const temMais = insights.length > LIMITE_VISIVEL;
  const visiveis = expandido ? insights : insights.slice(0, LIMITE_VISIVEL);

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <IconBell className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Seu Gerente Financeiro</h2>
          <p className="text-xs text-gray-400">Observações sobre a sua situação financeira este mês</p>
        </div>
      </div>

      <div className="space-y-2">
        {visiveis.map((insight, i) => {
          const estilo = ESTILO_SEVERIDADE[insight.severidade];
          const Icon = estilo.icon;
          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-3 rounded-xl border border-l-4 border-gray-100 px-3 py-2.5',
                estilo.borda
              )}
            >
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', estilo.badge)}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="pt-0.5 text-sm text-gray-700">{insight.mensagem}</p>
            </div>
          );
        })}
      </div>

      {temMais && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          {expandido ? 'Ver menos' : `Ver mais ${insights.length - LIMITE_VISIVEL} observações`}
          <IconChevronDown className={cn('h-3.5 w-3.5 transition-transform', expandido && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}
