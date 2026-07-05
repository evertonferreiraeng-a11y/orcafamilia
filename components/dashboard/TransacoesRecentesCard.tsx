import Link from 'next/link';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { IconTrendUp, IconTrendDown } from '@/components/icons';

export interface TransacaoRecente {
  id: string;
  descricao: string;
  categoria: string;
  cor: string | null;
  tipo: 'receita' | 'despesa';
  valor: number;
  data: string;
  pago: boolean;
}

export function TransacoesRecentesCard({ transacoes }: { transacoes: TransacaoRecente[] }) {
  return (
    <div className="card flex flex-col p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Transações Recentes</h2>

      {transacoes.length === 0 ? (
        <p className="flex-1 py-8 text-center text-sm text-gray-400">Nenhuma transação neste período.</p>
      ) : (
        <div className="flex-1 space-y-4">
          {transacoes.map((t) => {
            const TrendIcon = t.tipo === 'receita' ? IconTrendUp : IconTrendDown;
            return (
              <div key={t.id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ backgroundColor: `${t.cor ?? '#888888'}1a`, color: t.cor ?? '#888888' }}
                  >
                    {t.categoria.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{t.descricao}</p>
                    <p className="flex items-center gap-1.5 text-xs text-gray-400">
                      {formatDate(t.data)} ·
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-medium',
                          t.pago ? 'text-positive' : 'text-amber-600'
                        )}
                      >
                        <TrendIcon className="h-3 w-3" />
                        {t.pago ? 'Pago' : 'Pendente'}
                      </span>
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-sm font-semibold',
                    t.tipo === 'receita' ? 'text-positive' : 'text-negative'
                  )}
                >
                  {t.tipo === 'receita' ? '+' : '-'}
                  {formatCurrency(Math.abs(t.valor))}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/transacoes"
        className="mt-4 block border-t border-gray-50 pt-3 text-center text-sm font-medium text-brand-600 hover:underline"
      >
        Ver todas as transações →
      </Link>
    </div>
  );
}
