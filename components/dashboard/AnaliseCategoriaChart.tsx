'use client';

import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, type TooltipProps } from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface CategoriaMeta {
  id: string;
  nome: string;
  cor: string | null;
  tipo: 'receita' | 'despesa';
}

export interface TransacaoResumoAno {
  data: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  categoria_id: string | null;
}

function TooltipCategorias({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((a, p) => a + Number(p.value ?? 0), 0);
  return (
    <div className="max-w-xs rounded-xl bg-gray-900 px-3 py-2.5 text-xs text-white shadow-elevated">
      <p className="mb-1.5 font-medium text-gray-300">
        {label} · Total: {formatCurrency(total)}
      </p>
      <div className="space-y-1">
        {payload
          .filter((p) => Number(p.value ?? 0) > 0)
          .map((item) => (
            <p key={item.dataKey as string} className="flex items-center justify-between gap-3 whitespace-nowrap">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.dataKey}
              </span>
              <span className="font-semibold">{formatCurrency(Number(item.value ?? 0))}</span>
            </p>
          ))}
      </div>
    </div>
  );
}

export function AnaliseCategoriaChart({
  transacoes,
  categorias,
}: {
  transacoes: TransacaoResumoAno[];
  categorias: CategoriaMeta[];
}) {
  const [tipo, setTipo] = useState<'despesa' | 'receita'>('despesa');

  const categoriasDoTipo = useMemo(() => categorias.filter((c) => c.tipo === tipo), [categorias, tipo]);

  const { dados, total } = useMemo(() => {
    const porMes: Record<string, number>[] = Array.from({ length: 12 }, () => ({}));
    let soma = 0;

    for (const t of transacoes) {
      if (t.tipo !== tipo || !t.categoria_id) continue;
      const mesT = Number(t.data.split('-')[1]);
      const categoria = categoriasDoTipo.find((c) => c.id === t.categoria_id);
      if (!categoria) continue;
      const mesIndex = mesT - 1;
      porMes[mesIndex][categoria.nome] = (porMes[mesIndex][categoria.nome] ?? 0) + Number(t.valor);
      soma += Number(t.valor);
    }

    const linhas = MESES_ABREV.map((label, i) => ({ label, ...porMes[i] }));
    return { dados: linhas, total: soma };
  }, [transacoes, tipo, categoriasDoTipo]);

  return (
    <div className="card p-5">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Análise por Categoria</h2>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-lg font-bold text-brand-600">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTipo('despesa')}
            className={cn('rounded-md px-3 py-1 font-medium', tipo === 'despesa' ? 'bg-gray-900 text-white' : 'text-gray-500')}
          >
            Despesas
          </button>
          <button
            type="button"
            onClick={() => setTipo('receita')}
            className={cn('rounded-md px-3 py-1 font-medium', tipo === 'receita' ? 'bg-gray-900 text-white' : 'text-gray-500')}
          >
            Receitas
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        {categoriasDoTipo.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.cor ?? '#888888' }} />
            {c.nome}
          </span>
        ))}
      </div>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Sem dados para o período selecionado.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              width={40}
            />
            <Tooltip content={<TooltipCategorias />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            {categoriasDoTipo.map((c) => (
              <Bar key={c.id} dataKey={c.nome} name={c.nome} stackId="a" fill={c.cor ?? '#888888'} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
