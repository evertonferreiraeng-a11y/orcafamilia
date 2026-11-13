'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ValorAnimado } from '@/components/ui/ValorAnimado';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  type TooltipProps,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';

export interface PontoBalanco {
  label: string;
  receita: number;
  despesa: number;
  receitaPago: number;
  despesaPago: number;
}

type TipoGrafico = 'area' | 'linha' | 'barra';
type Modo = 'ano' | 'mes';

function BalancoTooltip({ active, payload, label, clicavel }: TooltipProps<number, string> & { clicavel?: boolean }) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0]?.payload as { receita: number; despesa: number; saldo: number } | undefined;
  if (!ponto) return null;
  const vazio = ponto.receita === 0 && ponto.despesa === 0;
  return (
    <div className="min-w-[180px] rounded-2xl bg-gray-900/95 px-3.5 py-3 text-xs text-white shadow-elevated backdrop-blur">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {vazio ? (
        <p className="text-gray-400">Sem lançamentos</p>
      ) : (
        <div className="space-y-1.5">
          <p className="flex items-center justify-between gap-4">
            <span className="text-gray-300">📈 Receitas</span>
            <span className="font-semibold text-emerald-300">{formatCurrency(ponto.receita)}</span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-gray-300">📉 Despesas</span>
            <span className="font-semibold text-red-300">{formatCurrency(ponto.despesa)}</span>
          </p>
          <p className="flex items-center justify-between gap-4 border-t border-white/10 pt-1.5">
            <span className="text-gray-300">{ponto.saldo >= 0 ? '🐷 Sobrou' : '⚠️ Faltou'}</span>
            <span className={cn('font-bold', ponto.saldo >= 0 ? 'text-sky-300' : 'text-red-300')}>{formatCurrency(Math.abs(ponto.saldo))}</span>
          </p>
          {ponto.receita > 0 && (
            <p className="text-[11px] text-gray-400">gastou {Math.round((ponto.despesa / ponto.receita) * 100)}% do que entrou</p>
          )}
        </div>
      )}
      {clicavel && <p className="mt-2 text-[11px] text-sky-300">Clique para abrir este mês →</p>}
    </div>
  );
}

function Indicador({ emoji, rotulo, valor, cor }: { emoji: string; rotulo: string; valor: number; cor: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-gray-50 px-3 py-2 transition hover:bg-gray-100">
      <p className="truncate text-[11px] font-medium text-gray-500">
        <span className="mr-1">{emoji}</span>
        {rotulo}
      </p>
      <p className={cn('truncate text-base font-bold tabular-nums', cor)}>
        <ValorAnimado valor={valor} />
      </p>
    </div>
  );
}

export function BalancoMensalChart({
  diario,
  mensal,
  ano,
  mesSelecionado,
}: {
  diario: PontoBalanco[];
  mensal: PontoBalanco[];
  /** Ano exibido no modo "Ano" (para o clique abrir o mês). */
  ano?: number;
  /** Índice 0–11 do mês aberto no Dashboard (destacado no gráfico). */
  mesSelecionado?: number;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>('ano');
  const [emFoco, setEmFoco] = useState<number | null>(null);
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>('barra');
  const [incluirPendentes, setIncluirPendentes] = useState(false);

  const dadosBase = modo === 'ano' ? mensal : diario;

  const dados = useMemo(
    () =>
      dadosBase.map((d) => {
        const receita = incluirPendentes ? d.receita : d.receitaPago;
        const despesa = incluirPendentes ? d.despesa : d.despesaPago;
        return { label: d.label, receita, despesa, saldo: receita - despesa };
      }),
    [dadosBase, incluirPendentes]
  );

  const totais = useMemo(() => {
    const totalReceita = dados.reduce((a, d) => a + d.receita, 0);
    const totalDespesa = dados.reduce((a, d) => a + d.despesa, 0);
    const comMovimento = dados.filter((d) => d.receita > 0 || d.despesa > 0);
    const mediaDespesa = comMovimento.length ? comMovimento.reduce((a, d) => a + d.despesa, 0) / comMovimento.length : 0;
    return { receita: totalReceita, despesa: totalDespesa, saldo: totalReceita - totalDespesa, mediaDespesa, meses: comMovimento.length };
  }, [dados]);

  const clicavel = modo === 'ano' && ano != null;
  const destaque = emFoco ?? (modo === 'ano' ? mesSelecionado ?? null : null);
  const opacidade = (i: number) => (destaque == null || destaque === i ? 1 : 0.35);

  function abrirMes(i: number) {
    if (!clicavel) return;
    router.push(`/dashboard?mes=${ano}-${String(i + 1).padStart(2, '0')}`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-xl">📊</span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Balanço {modo === 'ano' ? `de ${ano ?? 'do ano'}` : 'do mês, dia a dia'}</h2>
            <p className="text-xs text-gray-500">
              {clicavel ? 'Passe o mouse para ver o mês · clique na barra para abrir' : 'Passe o mouse para ver cada dia'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
            {(['area', 'linha', 'barra'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoGrafico(t)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium capitalize transition-colors',
                  tipoGrafico === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t === 'area' ? 'Área' : t === 'linha' ? 'Linha' : 'Barra'}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
            {(['ano', 'mes'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  modo === m ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {m === 'ano' ? 'Ano' : 'Mês'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-positive" /> Receitas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-negative" /> Despesas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> Saldo
          </span>
          <label className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={incluirPendentes}
              onClick={() => setIncluirPendentes((v) => !v)}
              className={cn(
                'relative h-5 w-9 shrink-0 overflow-hidden rounded-full transition-colors',
                incluirPendentes ? 'bg-brand-600' : 'bg-gray-200'
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                  incluirPendentes && 'translate-x-4'
                )}
              />
            </button>
            Incluir pendentes
          </label>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Indicador emoji="📈" rotulo="Receitas" valor={totais.receita} cor="text-positive" />
        <Indicador emoji="📉" rotulo="Despesas" valor={totais.despesa} cor="text-negative" />
        <Indicador emoji={totais.saldo >= 0 ? '🐷' : '⚠️'} rotulo={totais.saldo >= 0 ? 'Sobrou' : 'Faltou'} valor={Math.abs(totais.saldo)} cor={totais.saldo >= 0 ? 'text-brand-600' : 'text-negative'} />
        <Indicador emoji="〰️" rotulo={`Média de gastos/${modo === 'ano' ? 'mês' : 'dia'}`} valor={totais.mediaDespesa} cor="text-gray-800" />
      </div>

      <div className="min-h-[280px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={dados}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            barGap={3}
            barCategoryGap={modo === 'ano' ? '22%' : '12%'}
            onMouseMove={(e) => setEmFoco(typeof e?.activeTooltipIndex === 'number' ? e.activeTooltipIndex : null)}
            onMouseLeave={() => setEmFoco(null)}
            onClick={(e) => typeof e?.activeTooltipIndex === 'number' && abrirMes(e.activeTooltipIndex)}
            style={{ cursor: clicavel ? 'pointer' : 'default' }}
          >
            <defs>
              <linearGradient id="corReceitaBalanco" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="corDespesaBalanco" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="barraReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
              <linearGradient id="barraDespesa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
              <linearGradient id="corSaldoBalanco" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(var(--brand-500))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="rgb(var(--brand-500))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              width={40}
            />
            <Tooltip content={<BalancoTooltip clicavel={clicavel} />} cursor={{ fill: 'rgba(37, 99, 235, 0.06)', radius: 8 } as object} />
            {totais.mediaDespesa > 0 && totais.meses > 1 && (
              <ReferenceLine
                y={totais.mediaDespesa}
                stroke="#9ca3af"
                strokeDasharray="4 4"
                label={{ value: 'média de gastos', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
              />
            )}
            {tipoGrafico === 'barra' && (
              <>
                <Bar dataKey="receita" name="Receita" fill="url(#barraReceita)" radius={[6, 6, 0, 0]} maxBarSize={28} animationDuration={900}>
                  {dados.map((_, i) => (
                    <Cell key={i} fillOpacity={opacidade(i)} />
                  ))}
                </Bar>
                <Bar dataKey="despesa" name="Despesa" fill="url(#barraDespesa)" radius={[6, 6, 0, 0]} maxBarSize={28} animationDuration={900} animationBegin={150}>
                  {dados.map((_, i) => (
                    <Cell key={i} fillOpacity={opacidade(i)} />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo"
                  stroke="rgb(var(--brand-500))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  animationDuration={1100}
                  animationBegin={300}
                />
              </>
            )}
            {tipoGrafico === 'linha' && (
              <>
                <Line type="monotone" dataKey="receita" name="Receita" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="despesa" name="Despesa" stroke="#dc2626" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="saldo" name="Saldo" stroke="rgb(var(--brand-500))" strokeWidth={2} dot={false} />
              </>
            )}
            {tipoGrafico === 'area' && (
              <>
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="#16a34a"
                  fill="url(#corReceitaBalanco)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="despesa"
                  name="Despesa"
                  stroke="#dc2626"
                  fill="url(#corDespesaBalanco)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo"
                  stroke="rgb(var(--brand-500))"
                  fill="url(#corSaldoBalanco)"
                  strokeWidth={2}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
