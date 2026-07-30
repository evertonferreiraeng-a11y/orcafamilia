import { cn } from '@/lib/utils';
import { IconBell, IconAlerta, IconTrendUp, IconCheck } from '@/components/icons';
import type { Insight, InsightSeveridade } from '@/lib/gerente';

const ESTILO_SEVERIDADE: Record<InsightSeveridade, { badge: string; icon: typeof IconAlerta }> = {
  alerta: { badge: 'bg-negative/10 text-negative', icon: IconAlerta },
  aviso: { badge: 'bg-amber-100 text-amber-700', icon: IconAlerta },
  dica: { badge: 'bg-brand-50 text-brand-600', icon: IconTrendUp },
  elogio: { badge: 'bg-positive/10 text-positive', icon: IconCheck },
};

export function GerenteFinanceiroCard({ insights }: { insights: Insight[] }) {
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
        {insights.map((insight, i) => {
          const estilo = ESTILO_SEVERIDADE[insight.severidade];
          const Icon = estilo.icon;
          return (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', estilo.badge)}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="pt-0.5 text-sm text-gray-700">{insight.mensagem}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
