'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useCasa } from '@/components/casa/CasaContext';
import { Anel, Atencao, Barra, BotaoIcone, Secao, Vazio } from '@/components/estoque/ui';
import { IconCheck, IconChevronRight, IconEdit, IconEquipamento, IconHistorico, IconPlus, IconSearch } from '@/components/icons';
import { fmtData, fmtMesCurto, fmtMoeda, hojeISO, ultimosMeses } from '@/lib/estoque/calc';
import {
  STATUS_TAREFA,
  agenda,
  categoriaTarefa,
  custoAnualEstimado,
  gastoNoPeriodo,
  nomeTarefa,
  ordemTarefas,
  statusGarantia,
  statusTarefa,
  textoFrequencia,
  textoPrazoTarefa,
  type StatusTarefa,
} from '@/lib/casa/calc';
import { cicloTarefa, emojiCasa } from '@/lib/casa/visual';
import { TOM_TAREFA } from '@/components/casa/TelasCasa';
import type { CasaTarefa } from '@/types/database';

type Filtro = 'todas' | StatusTarefa;
const FILTROS: { id: Filtro; rotulo: string; ponto?: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'vencida', rotulo: 'Vencidas', ponto: 'bg-red-500' },
  { id: 'breve', rotulo: 'Em breve', ponto: 'bg-amber-500' },
  { id: 'emdia', rotulo: 'Em dia', ponto: 'bg-emerald-500' },
  { id: 'semdata', rotulo: 'Sem data', ponto: 'bg-gray-400' },
];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/* ---------- linha de manutenção dentro da categoria ---------- */
function LinhaTarefa({ t }: { t: CasaTarefa }) {
  const { dados, abrir } = useCasa();
  const s = statusTarefa(t);
  const item = t.item_id ? dados.itens.find((i) => i.id === t.item_id) : undefined;
  const ciclo = cicloTarefa(t);
  const corPrazo = s === 'vencida' ? 'text-red-600' : s === 'breve' ? 'text-amber-700' : 'text-gray-500';
  return (
    <div className={`group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-gray-50 ${s === 'pausada' ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2 text-sm">
          <button type="button" onClick={() => abrir({ tipo: 'tarefa', id: t.id })} className="min-w-0 flex-1 truncate text-left font-medium text-gray-800 hover:text-amber-700" title="Editar manutenção">
            {t.titulo}
            {item && <span className="font-normal text-gray-400"> · {item.nome}</span>}
          </button>
          <span className={`shrink-0 text-xs font-semibold tabular-nums ${corPrazo}`}>{s === 'semdata' ? 'sem data' : s === 'pausada' ? 'pausada' : textoPrazoTarefa(t)}</span>
        </div>
        {ciclo !== null ? <Barra pct={ciclo} tom={TOM_TAREFA[s]} /> : <div className="h-2 rounded-full border border-dashed border-gray-200" />}
        <p className="mt-0.5 text-[11px] text-gray-500">
          {textoFrequencia(t.freq_valor, t.freq_unidade)}
          {t.proxima_data ? ` · próxima ${fmtData(t.proxima_data)}` : ' · clique em ✓ e informe a última vez'}
        </p>
      </div>
      <div className="flex shrink-0 gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
        <BotaoIcone titulo={`Marcar “${t.titulo}” como feito`} onClick={() => abrir({ tipo: 'feito', tarefaId: t.id })}>
          <IconCheck className="h-4 w-4" />
        </BotaoIcone>
        <BotaoIcone titulo="Editar" onClick={() => abrir({ tipo: 'tarefa', id: t.id })}>
          <IconEdit className="h-4 w-4" />
        </BotaoIcone>
      </div>
    </div>
  );
}

/* ---------- cartão de categoria (abre e fecha) ---------- */
function CartaoCategoria({ nome, tarefas, aberto, alternar }: { nome: string; tarefas: CasaTarefa[]; aberto: boolean; alternar: () => void }) {
  const ativas = tarefas.filter((t) => t.ativa);
  const emDia = ativas.filter((t) => statusTarefa(t) === 'emdia').length;
  const vencidas = ativas.filter((t) => statusTarefa(t) === 'vencida').length;
  const breve = ativas.filter((t) => statusTarefa(t) === 'breve').length;
  const pct = ativas.length ? (emDia / ativas.length) * 100 : 0;
  const cor = vencidas ? '#ef4444' : breve ? '#f59e0b' : '#059669';
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white transition-shadow ${aberto ? 'border-gray-200 shadow-card' : 'border-gray-100 shadow-soft hover:shadow-card'}`}>
      <button type="button" onClick={alternar} aria-expanded={aberto} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl" aria-hidden>
          {emojiCasa(nome)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">{nome}</span>
          <span className="block text-xs text-gray-500">
            {emDia} de {ativas.length} em dia
            {vencidas > 0 && <span className="text-red-600"> · {vencidas} vencida(s)</span>}
            {!vencidas && breve > 0 && <span className="text-amber-700"> · {breve} em breve</span>}
          </span>
        </span>
        <Anel pct={pct} tamanho={44} espessura={5} cor={cor} fundo="#f1f3f5">
          <span className="text-[10px] font-bold tabular-nums text-gray-700">{Math.round(pct)}%</span>
        </Anel>
        <IconChevronRight className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${aberto ? 'rotate-90' : ''}`} />
      </button>
      {aberto && (
        <div className="space-y-0.5 border-t border-gray-100 px-2 py-2">
          {tarefas.map((t) => (
            <LinhaTarefa key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= PAINEL ================= */
export function PainelCasa() {
  const { dados, abrir } = useCasa();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busca, setBusca] = useState('');
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const hoje = hojeISO();

  const ativas = dados.tarefas.filter((t) => t.ativa);
  const conta = (s: StatusTarefa) => dados.tarefas.filter((t) => statusTarefa(t) === s).length;
  const comData = ativas.filter((t) => t.proxima_data);
  const pctEmDia = comData.length ? (conta('emdia') / comData.length) * 100 : 0;
  const garantias = dados.itens.filter((i) => statusGarantia(i) === 'breve');
  const proxima = ativas.filter((t) => t.proxima_data && t.proxima_data >= hoje).sort((a, b) => (a.proxima_data ?? '').localeCompare(b.proxima_data ?? ''))[0];
  const gastoAno = gastoNoPeriodo(dados, hoje.slice(0, 4));
  const gastoMes = gastoNoPeriodo(dados, hoje.slice(0, 7));

  const q = busca.trim().toLowerCase();
  const categorias = useMemo(() => {
    const g: Record<string, CasaTarefa[]> = {};
    for (const t of dados.tarefas) {
      if (filtro !== 'todas' && statusTarefa(t) !== filtro) continue;
      if (q && !`${nomeTarefa(dados, t)} ${categoriaTarefa(dados, t)}`.toLowerCase().includes(q)) continue;
      const c = categoriaTarefa(dados, t);
      (g[c] = g[c] || []).push(t);
    }
    const peso = (l: CasaTarefa[]) => Math.min(...l.map((t) => ({ vencida: 0, breve: 1, semdata: 2, emdia: 3, pausada: 4 })[statusTarefa(t)]));
    return Object.entries(g)
      .map(([nome, lista]) => ({ nome, lista: lista.sort(ordemTarefas) }))
      .sort((a, b) => peso(a.lista) - peso(b.lista) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [dados, filtro, q]);
  const filtrando = filtro !== 'todas' || !!q;
  const estaAberta = (nome: string) => abertas[nome] ?? (filtrando || categorias.length <= 2);
  const todasAbertas = categorias.length > 0 && categorias.every((c) => estaAberta(c.nome));
  const escolherFiltro = (f: Filtro) => {
    setFiltro(f);
    setAbertas({});
  };

  const eventos = agenda(dados, 6)
    .filter((e) => !e.atrasada)
    .slice(0, 8);
  const grafico = ultimosMeses(12).map((k) => ({ mes: fmtMesCurto(k), gasto: gastoNoPeriodo(dados, k) }));
  const temGasto = grafico.some((g) => g.gasto > 0);

  const botaoClaro = 'inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25';

  return (
    <div className="space-y-6">
      {/* ---------- faixa de abertura ---------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-orange-500 to-amber-400 px-6 py-6 text-white shadow-elevated sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 right-40 h-60 w-60 rounded-full bg-white/[0.06]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-5">
            <Anel pct={pctEmDia}>
              <span className="text-2xl font-bold tabular-nums">{Math.round(pctEmDia)}%</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-white/80">em dia</span>
            </Anel>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/75">Casa</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Nossa casa</h1>
              <p className="mt-1 text-sm text-white/85">
                {ativas.length} manutenção(ões) ativa(s) · {dados.itens.length} equipamento(s)
              </p>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:ml-auto lg:max-w-xl">
            <div className="col-span-2 rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-inset ring-white/20 sm:col-span-1">
              <p className="text-[11px] font-medium text-white/80">📅 Próxima</p>
              {proxima ? (
                <>
                  <p className="truncate text-base font-bold" title={nomeTarefa(dados, proxima)}>
                    {proxima.titulo}
                  </p>
                  <p className="text-[11px] text-white/80">
                    {fmtData(proxima.proxima_data)} · {textoPrazoTarefa(proxima)}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold">nada agendado</p>
              )}
            </div>
            <Link href="/casa/historico" className="rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-inset ring-white/20 transition hover:bg-white/25">
              <p className="text-[11px] font-medium text-white/80">💰 Gasto em {hoje.slice(0, 4)}</p>
              <p className="text-xl font-bold tabular-nums">{fmtMoeda(gastoAno)}</p>
              <p className="text-[11px] text-white/80">este mês: {fmtMoeda(gastoMes)}</p>
            </Link>
            <div className="rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-inset ring-white/20">
              <p className="text-[11px] font-medium text-white/80">📊 Custo anual est.</p>
              <p className="text-xl font-bold tabular-nums">{fmtMoeda(custoAnualEstimado(dados))}</p>
              <p className="text-[11px] text-white/80">manutenções ativas</p>
            </div>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => abrir({ tipo: 'tarefa' })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-amber-700 shadow-soft transition hover:bg-amber-50"
          >
            <IconPlus className="h-4 w-4" /> Nova manutenção
          </button>
          <button type="button" onClick={() => abrir({ tipo: 'item' })} className={botaoClaro}>
            <IconEquipamento className="h-4 w-4" /> Novo equipamento
          </button>
          <Link href="/casa/historico" className={botaoClaro}>
            <IconHistorico className="h-4 w-4" /> Histórico
          </Link>
        </div>
      </section>

      {/* ---------- atenção ---------- */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Atencao href="/casa/manutencoes?status=vencida" valor={conta('vencida')} rotulo="Manutenções vencidas" cor="bg-red-50 text-red-600" ok="nenhuma atrasada" />
        <Atencao href="/casa/manutencoes?status=breve" valor={conta('breve')} rotulo="Vencem em breve" cor="bg-amber-50 text-amber-600" ok="nada para os próximos dias" />
        <Atencao href="/casa/manutencoes?status=semdata" valor={conta('semdata')} rotulo="Sem data definida" cor="bg-sky-50 text-sky-600" ok="todas com data" />
        <Atencao href="/casa/manutencoes?visao=equipamentos" valor={garantias.length} rotulo="Garantias vencendo" cor="bg-orange-50 text-orange-600" ok="nenhuma nos próximos 90 dias" />
      </section>

      {conta('semdata') > 0 && (
        <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 px-5 py-4 text-sm text-sky-900">
          <b>{conta('semdata')} manutenção(ões) ainda sem data.</b> Em cada uma, clique em <b>✓ Feito</b> e informe quando foi feita pela última vez — o sistema calcula a próxima.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ---------- manutenções por categoria ---------- */}
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-base font-semibold text-gray-900">Manutenções por categoria</h2>
            <div className="relative w-full sm:w-auto">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="input-field !w-full !py-1.5 !pl-9 text-sm sm:!w-48" placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {FILTROS.map((f) => {
              const n = f.id === 'todas' ? dados.tarefas.length : conta(f.id);
              const ativo = filtro === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => escolherFiltro(f.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    ativo ? 'bg-gray-900 text-white shadow-soft' : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {f.ponto && <span className={`h-2 w-2 rounded-full ${f.ponto}`} />}
                  {f.rotulo}
                  <span className={`rounded-full px-1.5 tabular-nums ${ativo ? 'bg-white/20' : 'bg-gray-100'}`}>{n}</span>
                </button>
              );
            })}
            {categorias.length > 0 && (
              <button
                type="button"
                className="ml-auto text-xs font-semibold text-amber-700 hover:underline"
                onClick={() => setAbertas(Object.fromEntries(categorias.map((c) => [c.nome, !todasAbertas])))}
              >
                {todasAbertas ? 'Recolher tudo' : 'Expandir tudo'}
              </button>
            )}
          </div>
          {categorias.length ? (
            <div className="grid items-start gap-3 md:grid-cols-2">
              {categorias.map((c) => (
                <CartaoCategoria
                  key={c.nome}
                  nome={c.nome}
                  tarefas={c.lista}
                  aberto={estaAberta(c.nome)}
                  alternar={() => setAbertas((a) => ({ ...a, [c.nome]: !estaAberta(c.nome) }))}
                />
              ))}
            </div>
          ) : (
            <Secao>
              <Vazio>{dados.tarefas.length ? 'Nenhuma manutenção com esse filtro.' : 'Cadastre as manutenções da casa (filtro de água, ar-condicionado, caixa d’água…) para acompanhar aqui.'}</Vazio>
            </Secao>
          )}
        </section>

        {/* ---------- coluna lateral ---------- */}
        <aside className="space-y-6">
          <Secao titulo="Próximos 6 meses" extra={<Link href="/casa/manutencoes" className="text-xs font-semibold text-amber-700">Ver todas</Link>} semPadding>
            {eventos.length ? (
              <ul className="divide-y divide-gray-50">
                {eventos.map((e, i) => {
                  const s = statusTarefa(e.tarefa);
                  const cor = s === 'breve' && e.data === e.tarefa.proxima_data ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700';
                  return (
                    <li key={`${e.tarefa.id}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`flex w-12 shrink-0 flex-col items-center rounded-xl py-1 ${cor}`}>
                        <span className="text-base font-bold leading-tight tabular-nums">{e.data.slice(8, 10)}</span>
                        <span className="text-[10px] uppercase leading-tight">{MESES[Number(e.data.slice(5, 7)) - 1]}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{e.tarefa.titulo}</span>
                        <span className="block truncate text-xs text-gray-500">
                          {emojiCasa(categoriaTarefa(dados, e.tarefa))} {dados.itens.find((x) => x.id === e.tarefa.item_id)?.nome ?? categoriaTarefa(dados, e.tarefa)}
                        </span>
                      </span>
                      {e.data === e.tarefa.proxima_data && (
                        <button type="button" className="btn-secondary shrink-0 !px-2.5 !py-1 text-xs" onClick={() => abrir({ tipo: 'feito', tarefaId: e.tarefa.id })}>
                          Feito
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-3xl" aria-hidden>
                  🗓️
                </p>
                <p className="mt-1 text-sm text-gray-500">Defina as datas das manutenções para ver a agenda.</p>
              </div>
            )}
          </Secao>

          <Secao titulo="Situação das manutenções" extra={<span className="text-xs text-gray-400">clique para filtrar</span>}>
            <div className="space-y-3">
              {(
                [
                  ['emdia', 'bg-emerald-500'],
                  ['breve', 'bg-amber-500'],
                  ['vencida', 'bg-red-500'],
                  ['semdata', 'bg-gray-400'],
                ] as const
              ).map(([s, cor]) => {
                const n = conta(s);
                return (
                  <button key={s} type="button" onClick={() => escolherFiltro(s)} className="block w-full rounded-lg text-left transition hover:opacity-80">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-700">
                        <span className={`h-2.5 w-2.5 rounded-full ${cor}`} /> {STATUS_TAREFA[s]}
                      </span>
                      <b className="tabular-nums text-gray-900">{n}</b>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <span className={`block h-full rounded-full ${cor}`} style={{ width: `${ativas.length ? (n / ativas.length) * 100 : 0}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Secao>

          {garantias.length > 0 && (
            <Secao titulo="Garantias vencendo" extra={<Link href="/casa/manutencoes?visao=equipamentos" className="text-xs font-semibold text-amber-700">Equipamentos</Link>} semPadding>
              <ul className="divide-y divide-gray-50">
                {garantias.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="text-lg" aria-hidden>
                      🛡️
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{i.nome}</span>
                    <span className="shrink-0 text-xs text-gray-500">até {fmtData(i.garantia_ate)}</span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}
        </aside>
      </div>

      {/* ---------- gastos ---------- */}
      <Secao titulo="Gastos com manutenção" extra={<span className="text-xs text-gray-400">últimos 12 meses</span>}>
        {temGasto ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafico}>
                <CartesianGrid vertical={false} stroke="#eef1f4" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} tickFormatter={(v: number) => `R$ ${Math.round(Number(v))}`} />
                <Tooltip cursor={{ fill: '#fdf6ec' }} formatter={(v) => fmtMoeda(Number(v))} />
                <Bar dataKey="gasto" name="Gasto" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Vazio>Os custos registrados com “Feito” aparecem aqui, mês a mês.</Vazio>
        )}
      </Secao>
    </div>
  );
}
