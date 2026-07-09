'use client';

import Link from 'next/link';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { IconMetas } from '@/components/icons';
import { cn } from '@/lib/utils';

export function PlanejadoGaugeCard({
  planejado,
  gastoOrcamento,
  restanteOrcamento,
  percentualOrcamento,
  categoriasAcima,
}: {
  planejado: number;
  gastoOrcamento: number;
  restanteOrcamento: number;
  percentualOrcamento: number;
  categoriasAcima: number;
}) {
  const percentualPreenchido = Math.min(100, Math.max(0, percentualOrcamento));
  const corPonteiro = percentualOrcamento > 100 ? '#dc2626' : percentualOrcamento >= 80 ? '#f59e0b' : '#16a34a';
  const dadosGauge = [
    { name: 'usado', value: percentualPreenchido },
    { name: 'restante', value: 100 - percentualPreenchido },
  ];

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <IconMetas className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-gray-500">Planejado</p>
            <p className="text-xl font-bold text-gray-900">
              <ValorMonetario valor={planejado} />
            </p>
          </div>
        </div>
      </div>

      {planejado > 0 ? (
        <>
          <div className="relative mt-1">
            <ResponsiveContainer width="100%" height={120}>
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={dadosGauge}
                  dataKey="value"
                  startAngle={180}
                  endAngle={0}
                  cx="50%"
                  cy="95%"
                  innerRadius={62}
                  outerRadius={86}
                  stroke="none"
                  isAnimationActive={false}
                >
                  <Cell fill={corPonteiro} />
                  <Cell fill="#e5e7eb" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
              <p className="text-2xl font-bold text-gray-900">{percentualOrcamento.toFixed(0)}%</p>
              <p className="text-xs text-gray-400">usado</p>
            </div>
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Gasto: <ValorMonetario valor={gastoOrcamento} />
            </span>
            <span>
              Restante: <ValorMonetario valor={restanteOrcamento} />
            </span>
          </div>
          {categoriasAcima > 0 && (
            <p className="mt-2 text-xs font-medium text-negative">
              {categoriasAcima} {categoriasAcima === 1 ? 'categoria acima' : 'categorias acima'} do orçamento
            </p>
          )}
        </>
      ) : (
        <Link href="/orcamentos" className="mt-4 inline-block text-xs font-medium text-brand-600 hover:underline">
          Definir orçamento do mês
        </Link>
      )}
    </div>
  );
}
