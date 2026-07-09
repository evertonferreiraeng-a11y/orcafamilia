'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  type TooltipProps,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import type { CategoriaEvolucao } from '@/components/indicadores/IndicadoresClient';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function EvolucaoTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-gray-900 px-3 py-2.5 text-xs text-white shadow-elevated">
      <p className="mb-1.5 font-medium text-gray-300">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <p key={item.dataKey as string} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-gray-300">{item.name}:</span>
            <span className="font-semibold">{formatCurrency(Number(item.value ?? 0))}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function PainelCategoria({
  titulo,
  categorias,
  corRealizado,
}: {
  titulo: string;
  categorias: CategoriaEvolucao[];
  corRealizado: string;
}) {
  const [selecionadaId, setSelecionadaId] = useState(categorias[0]?.id ?? '');
  const categoria = categorias.find((c) => c.id === selecionadaId) ?? categorias[0];

  const dados = MESES_ABREV.map((label, i) => ({
    label,
    orcado: categoria?.orcadoPorMes[i] ?? 0,
    realizado: categoria?.realizadoPorMes[i] ?? 0,
  }));

  const totalOrcado = dados.reduce((a, d) => a + d.orcado, 0);
  const totalRealizado = dados.reduce((a, d) => a + d.realizado, 0);

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-700">{titulo}</h3>
        {categorias.length > 0 && (
          <select
            value={categoria?.id}
            onChange={(e) => setSelecionadaId(e.target.value)}
            className="input-field w-auto py-1 text-xs"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {!categoria ? (
        <p className="py-10 text-center text-sm text-gray-400">Nenhuma categoria cadastrada.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                width={40}
              />
              <Tooltip content={<EvolucaoTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="realizado" name="Realizado" fill={corRealizado} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="orcado" name="Orçamento" stroke="#111827" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-2 py-2 font-medium">Mês</th>
                  <th className="px-2 py-2 text-right font-medium">Orçamento</th>
                  <th className="px-2 py-2 text-right font-medium">Realizado</th>
                  <th className="px-2 py-2 text-right font-medium">Variação %</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((d) => {
                  const variacao = d.orcado > 0 ? (d.realizado / d.orcado) * 100 : null;
                  return (
                    <tr key={d.label} className="border-b border-gray-50 last:border-0">
                      <td className="px-2 py-1.5 text-gray-600">{d.label}</td>
                      <td className="px-2 py-1.5 text-right text-gray-500">{formatCurrency(d.orcado)}</td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-900">{formatCurrency(d.realizado)}</td>
                      <td
                        className={cn(
                          'px-2 py-1.5 text-right font-medium',
                          variacao === null ? 'text-gray-400' : variacao > 100 ? 'text-negative' : 'text-positive'
                        )}
                      >
                        {variacao === null ? '—' : `${variacao.toFixed(0)}%`}
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-semibold text-gray-900">
                  <td className="px-2 py-2">Total</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(totalOrcado)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(totalRealizado)}</td>
                  <td className="px-2 py-2 text-right">
                    {totalOrcado > 0 ? `${((totalRealizado / totalOrcado) * 100).toFixed(0)}%` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ValorMensalTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-gray-900 px-3 py-2.5 text-xs text-white shadow-elevated">
      <p className="mb-1 font-medium text-gray-300">{label}</p>
      <p className="font-semibold">{formatCurrency(Number(payload[0]?.value ?? 0))}</p>
    </div>
  );
}

function influenciaLabel(pct: number): string {
  if (pct >= 50) return 'Grande';
  if (pct >= 20) return 'Média';
  return 'Pequena';
}

function PainelDrillDown({
  categoriasReceita,
  categoriasDespesa,
}: {
  categoriasReceita: CategoriaEvolucao[];
  categoriasDespesa: CategoriaEvolucao[];
}) {
  const [tipo, setTipo] = useState<'despesa' | 'receita'>('despesa');
  const categorias = tipo === 'receita' ? categoriasReceita : categoriasDespesa;

  const [grupoId, setGrupoId] = useState(categorias[0]?.id ?? '');
  const grupo = categorias.find((c) => c.id === grupoId) ?? categorias[0];

  const [subGrupoId, setSubGrupoId] = useState(grupo?.subcategorias[0]?.id ?? '');
  const subGrupo = grupo?.subcategorias.find((s) => s.id === subGrupoId) ?? grupo?.subcategorias[0];

  function mudarTipo(novoTipo: 'despesa' | 'receita') {
    setTipo(novoTipo);
    const novasCategorias = novoTipo === 'receita' ? categoriasReceita : categoriasDespesa;
    const novoGrupo = novasCategorias[0];
    setGrupoId(novoGrupo?.id ?? '');
    setSubGrupoId(novoGrupo?.subcategorias[0]?.id ?? '');
  }

  function mudarGrupo(novoGrupoId: string) {
    setGrupoId(novoGrupoId);
    const novoGrupo = categorias.find((c) => c.id === novoGrupoId);
    setSubGrupoId(novoGrupo?.subcategorias[0]?.id ?? '');
  }

  const dadosGrupo = useMemo(
    () => MESES_ABREV.map((label, i) => ({ label, valor: grupo?.realizadoPorMes[i] ?? 0 })),
    [grupo]
  );
  const dadosSubGrupo = useMemo(
    () => MESES_ABREV.map((label, i) => ({ label, valor: subGrupo?.realizadoPorMes[i] ?? 0 })),
    [subGrupo]
  );

  const totalGrupo = dadosGrupo.reduce((a, d) => a + d.valor, 0);
  const totalSubGrupo = dadosSubGrupo.reduce((a, d) => a + d.valor, 0);

  const top5 = useMemo(() => {
    return (grupo?.subcategorias ?? [])
      .map((s) => ({ id: s.id, nome: s.nome, total: s.realizadoPorMes.reduce((a, v) => a + v, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [grupo]);
  const maiorTop5 = top5[0]?.total ?? 0;

  const dadosInfluencia = useMemo(
    () =>
      MESES_ABREV.map((label, i) => {
        const doGrupo = grupo?.realizadoPorMes[i] ?? 0;
        const doSub = subGrupo?.realizadoPorMes[i] ?? 0;
        return { label, influencia: doGrupo > 0 ? (doSub / doGrupo) * 100 : 0 };
      }),
    [grupo, subGrupo]
  );

  const influenciaTotal = totalGrupo > 0 ? (totalSubGrupo / totalGrupo) * 100 : 0;
  const dadosDonut = [
    { name: 'influencia', value: Math.min(100, influenciaTotal) },
    { name: 'restante', value: 100 - Math.min(100, influenciaTotal) },
  ];
  const corTipo = tipo === 'receita' ? '#16a34a' : '#dc2626';

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">
            Acompanhe a evolução no resultado do item:{' '}
            <span className="text-brand-600">{subGrupo?.nome ?? grupo?.nome ?? '—'}</span>
          </h3>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-gray-400">Tipo</p>
            <select value={tipo} onChange={(e) => mudarTipo(e.target.value as 'despesa' | 'receita')} className="input-field py-1.5 text-sm">
              <option value="despesa">Gastos</option>
              <option value="receita">Receitas</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-gray-400">Grupo</p>
            <select
              value={grupo?.id ?? ''}
              onChange={(e) => mudarGrupo(e.target.value)}
              className="input-field py-1.5 text-sm"
              disabled={categorias.length === 0}
            >
              {categorias.length === 0 && <option value="">Nenhuma categoria</option>}
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-gray-400">Sub-Grupo</p>
            <select
              value={subGrupo?.id ?? ''}
              onChange={(e) => setSubGrupoId(e.target.value)}
              className="input-field py-1.5 text-sm"
              disabled={(grupo?.subcategorias.length ?? 0) === 0}
            >
              {(grupo?.subcategorias.length ?? 0) === 0 && <option value="">Sem subcategorias</option>}
              {grupo?.subcategorias.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!grupo ? (
        <div className="card p-10 text-center text-sm text-gray-400">Nenhuma categoria cadastrada para este tipo.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card p-4 lg:col-span-2">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Valor mensal do Grupo</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dadosGrupo} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                    width={40}
                  />
                  <Tooltip content={<ValorMensalTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="valor" name="Valor" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="card p-4">
                <p className="text-xs font-medium uppercase text-gray-400">Total do Grupo</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(totalGrupo)}</p>
                <p className="mt-1 text-xs text-gray-400">{grupo.nome}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs font-medium uppercase text-gray-400">Total Sub-Grupo</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(totalSubGrupo)}</p>
                <p className="mt-1 text-xs text-gray-400">{subGrupo?.nome ?? '—'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">TOP 5 do Grupo</h4>
              {top5.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Sem subcategorias com valores.</p>
              ) : (
                <div className="space-y-2.5">
                  {top5.map((item) => (
                    <div key={item.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className={cn('font-medium', item.id === subGrupoId ? 'text-brand-600' : 'text-gray-600')}>
                          {item.nome}
                        </span>
                        <span className="font-semibold text-gray-900">{formatCurrency(item.total)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className={cn('h-2 rounded-full', item.id === subGrupoId ? 'bg-brand-500' : 'bg-gray-400')}
                          style={{ width: `${maiorTop5 > 0 ? (item.total / maiorTop5) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Valor mensal do Sub-Grupo</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dadosSubGrupo} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                    width={40}
                  />
                  <Tooltip content={<ValorMensalTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="valor" name="Valor" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card p-4 lg:col-span-2">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Influência mensal do Sub-Grupo Selecionado</h4>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dadosInfluencia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="influenciaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={corTipo} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={corTipo} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    width={40}
                  />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl bg-gray-900 px-3 py-2.5 text-xs text-white shadow-elevated">
                          <p className="mb-1 font-medium text-gray-300">{label}</p>
                          <p className="font-semibold">{Number(payload[0]?.value ?? 0).toFixed(1)}%</p>
                        </div>
                      ) : null
                    }
                  />
                  <Area type="monotone" dataKey="influencia" name="Influência" stroke={corTipo} strokeWidth={2} fill="url(#influenciaGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card flex flex-col items-center justify-center p-4 text-center">
              <div className="relative h-[110px] w-[110px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosDonut}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={50}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      <Cell fill={corTipo} />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold text-gray-900">{influenciaTotal.toFixed(0)}%</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                O item <span className="font-semibold text-gray-900">{subGrupo?.nome ?? '—'}</span> tem{' '}
                <span className="font-semibold text-gray-900">{influenciaLabel(influenciaTotal)} Influência</span> (
                {influenciaTotal.toFixed(0)}%) no Grupo: <span className="font-semibold text-gray-900">{grupo.nome}</span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function EvolucaoContasReport({
  categoriasReceita,
  categoriasDespesa,
}: {
  categoriasReceita: CategoriaEvolucao[];
  categoriasDespesa: CategoriaEvolucao[];
}) {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-base font-semibold text-gray-900">Evolução das Contas</h2>
        <p className="text-sm text-gray-500">Acompanhe a evolução comparando o Orçamento vs. Realizado</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PainelCategoria titulo="Receitas" categorias={categoriasReceita} corRealizado="#16a34a" />
        <PainelCategoria titulo="Gastos" categorias={categoriasDespesa} corRealizado="#dc2626" />
      </div>

      <PainelDrillDown categoriasReceita={categoriasReceita} categoriasDespesa={categoriasDespesa} />
    </div>
  );
}
