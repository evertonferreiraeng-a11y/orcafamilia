'use client';

import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function MesDonutCard({
  mes,
  percentual,
  cor,
  label,
}: {
  mes: string;
  percentual: number;
  cor: string;
  label: string;
}) {
  const preenchido = Math.min(100, Math.max(0, percentual));
  const dados = [
    { name: 'preenchido', value: preenchido },
    { name: 'restante', value: 100 - preenchido },
  ];

  return (
    <div className="card p-3 text-center">
      <p className="text-sm font-medium text-gray-500">{mes}</p>
      <div className="relative mx-auto mt-1 h-[88px] w-[88px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dados}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={40}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={cor} />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900">{percentual.toFixed(0)}%</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-400">{label}</p>
    </div>
  );
}
