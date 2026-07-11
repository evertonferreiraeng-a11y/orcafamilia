'use client';

import Link from 'next/link';
import { ValorMonetario } from '@/components/ui/ValorMonetario';
import { IconMetas } from '@/components/icons';
import { cn } from '@/lib/utils';

const TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const CX = 130;
const CY = 132;
const RAIO_ARCO = 88;

function pontoArco(anguloGraus: number, raio: number) {
  const rad = (anguloGraus * Math.PI) / 180;
  return { x: CX + raio * Math.cos(rad), y: CY - raio * Math.sin(rad) };
}

export function PlanejadoGaugeCard({
  planejado,
  gastoOrcamento,
  restanteOrcamento,
  percentualOrcamento,
  categoriasAcima,
  className,
}: {
  planejado: number;
  gastoOrcamento: number;
  restanteOrcamento: number;
  percentualOrcamento: number;
  categoriasAcima: number;
  className?: string;
}) {
  const percentualPreenchido = Math.min(100, Math.max(0, percentualOrcamento));
  const anguloAtual = 180 * (1 - percentualPreenchido / 100);

  const inicioArco = pontoArco(180, RAIO_ARCO);
  const fimArco = pontoArco(0, RAIO_ARCO);
  const pontaPonteiro = pontoArco(anguloAtual, RAIO_ARCO + 15);
  const baseEsq = pontoArco(anguloAtual + 5, RAIO_ARCO - 10);
  const baseDir = pontoArco(anguloAtual - 5, RAIO_ARCO - 10);

  return (
    <div className={cn('card flex flex-col p-4', className)}>
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

      <div className="flex flex-1 flex-col justify-center">
        <svg viewBox="0 0 260 150" className="mt-1 w-full">
          <defs>
            <linearGradient id="planejadoGaugeGradient" x1={inicioArco.x} y1={inicioArco.y} x2={fimArco.x} y2={fimArco.y} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="35%" stopColor="#facc15" />
              <stop offset="65%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>

          <path
            d={`M ${inicioArco.x} ${inicioArco.y} A ${RAIO_ARCO} ${RAIO_ARCO} 0 0 1 ${fimArco.x} ${fimArco.y}`}
            fill="none"
            stroke="url(#planejadoGaugeGradient)"
            strokeWidth={16}
            strokeLinecap="round"
          />

          {TICKS.map((t) => {
            const p = pontoArco(180 * (1 - t / 100), RAIO_ARCO + 22);
            return (
              <text key={t} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 9 }} className="fill-gray-400">
                {t}%
              </text>
            );
          })}

          <polygon
            points={`${pontaPonteiro.x},${pontaPonteiro.y} ${baseEsq.x},${baseEsq.y} ${baseDir.x},${baseDir.y}`}
            className="fill-gray-800"
          />

          <text x={CX} y={CY - 4} textAnchor="middle" style={{ fontSize: 30, fontWeight: 700 }} className="fill-gray-900">
            {percentualOrcamento.toFixed(0)}%
          </text>
        </svg>

        {planejado > 0 ? (
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Gasto: <ValorMonetario valor={gastoOrcamento} />
            </span>
            <span>
              Restante: <ValorMonetario valor={restanteOrcamento} />
            </span>
          </div>
        ) : (
          <Link href="/orcamentos" className="block text-center text-xs font-medium text-brand-600 hover:underline">
            Definir orçamento do mês
          </Link>
        )}
        {categoriasAcima > 0 && (
          <p className="mt-2 text-center text-xs font-medium text-negative">
            {categoriasAcima} {categoriasAcima === 1 ? 'categoria acima' : 'categorias acima'} do orçamento
          </p>
        )}
      </div>
    </div>
  );
}
