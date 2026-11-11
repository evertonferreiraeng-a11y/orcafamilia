'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Tooltip } from 'recharts';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { Anel, Atencao, Barra, BotaoIcone, Secao, StatusBadge, Vazio } from '@/components/estoque/ui';
import { IconCarrinho, IconChevronRight, IconMenos, IconPlus, IconSearch } from '@/components/icons';
import {
  abaixoDoMinimo,
  alertaLote,
  estoqueAtual,
  fmtConteudo,
  fmtData,
  fmtMesCurto,
  fmtQtd,
  medidaDoProduto,
  movsAtivas,
  ordemFEFO,
  percentualMeta,
  percentualReserva,
  reposicao,
  soma,
  statusProduto,
  textoPrazo,
  ultimosMeses,
  type StatusProduto,
} from '@/lib/estoque/calc';
import { emojiCategoria } from '@/lib/estoque/visual';
import type { EstoqueProduto, TipoMovEstoque } from '@/types/database';

type Filtro = 'todos' | 'red' | 'amber' | 'green';
const FILTROS: { id: Filtro; rotulo: string; ponto?: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'red', rotulo: 'Sem estoque', ponto: 'bg-red-500' },
  { id: 'amber', rotulo: 'Abaixo da meta', ponto: 'bg-amber-500' },
  { id: 'green', rotulo: 'Completos', ponto: 'bg-emerald-500' },
];
const TOM_BARRA: Record<StatusProduto, 'verde' | 'amarelo' | 'vermelho' | 'cinza'> = { green: 'verde', amber: 'amarelo', red: 'vermelho', sm: 'cinza' };

/* ---------- linha de produto dentro da categoria ---------- */
function LinhaProduto({ p }: { p: EstoqueProduto }) {
  const { dados, abrir } = useEstoque();
  const tem = Math.max(estoqueAtual(dados, p), 0);
  const falta = reposicao(dados, p);
  const st = statusProduto(dados, p);
  const pct = percentualMeta(dados, p) * 100;
  const equiv = (q: number) => (!medidaDoProduto(p.unidade) && p.emb_conteudo && p.emb_unidade && q > 0 ? ` (≈ ${fmtConteudo(q * p.emb_conteudo, p.emb_unidade)})` : '');
  return (
    <div className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2 text-sm">
          <Link href={`/estoque/lotes?produto=${p.id}`} className="min-w-0 flex-1 truncate font-medium text-gray-800 hover:text-brand-600" title="Ver lotes e validades">
            {p.nome}
          </Link>
          <span className="shrink-0 text-xs tabular-nums text-gray-500">
            <b className="text-gray-900">{fmtQtd(tem)}</b> de {fmtQtd(p.meta)} {p.unidade}
          </span>
        </div>
        <Barra pct={pct} tom={TOM_BARRA[st]} />
        <p className={`mt-0.5 text-[11px] ${falta > 0 ? 'text-gray-500' : 'font-medium text-emerald-600'}`}>
          {falta > 0 ? `Faltam ${fmtQtd(falta)} ${p.unidade}${equiv(falta)}` : 'Meta atingida ✓'}
          {abaixoDoMinimo(dados, p) && <span className="ml-1.5 font-medium text-amber-700">· abaixo do mínimo</span>}
        </p>
      </div>
      <div className="flex shrink-0 gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
        <BotaoIcone titulo={`Entrada de ${p.nome}`} onClick={() => abrir({ tipo: 'entrada', produtoId: p.id })}>
          <IconPlus className="h-4 w-4" />
        </BotaoIcone>
        <BotaoIcone titulo={`Saída de ${p.nome}`} onClick={() => abrir({ tipo: 'saida', produtoId: p.id })}>
          <IconMenos className="h-4 w-4" />
        </BotaoIcone>
      </div>
    </div>
  );
}

/* ---------- cartão de categoria (abre e fecha) ---------- */
function CartaoCategoria({ nome, produtos, aberto, alternar }: { nome: string; produtos: EstoqueProduto[]; aberto: boolean; alternar: () => void }) {
  const { dados } = useEstoque();
  const pct = produtos.length ? (soma(produtos, (p) => percentualMeta(dados, p)) / produtos.length) * 100 : 0;
  const completos = produtos.filter((p) => statusProduto(dados, p) === 'green').length;
  const zerados = produtos.filter((p) => statusProduto(dados, p) === 'red').length;
  const cor = pct >= 100 ? '#059669' : zerados === produtos.length ? '#ef4444' : '#f59e0b';
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white transition-shadow ${aberto ? 'border-gray-200 shadow-card' : 'border-gray-100 shadow-soft hover:shadow-card'}`}>
      <button type="button" onClick={alternar} aria-expanded={aberto} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-xl" aria-hidden>
          {emojiCategoria(nome)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">{nome}</span>
          <span className="block text-xs text-gray-500">
            {completos} de {produtos.length} completo(s)
            {zerados > 0 && <span className="text-red-600"> · {zerados} sem estoque</span>}
          </span>
        </span>
        <Anel pct={pct} tamanho={44} espessura={5} cor={cor} fundo="#f1f3f5">
          <span className="text-[10px] font-bold tabular-nums text-gray-700">{Math.round(pct)}%</span>
        </Anel>
        <IconChevronRight className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${aberto ? 'rotate-90' : ''}`} />
      </button>
      {aberto && (
        <div className="space-y-0.5 border-t border-gray-100 px-2 py-2">
          {produtos.map((p) => (
            <LinhaProduto key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= PAINEL ================= */
export function PainelEstoque() {
  const { dados, abrir } = useEstoque();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});

  const ps = dados.produtos;
  const comMeta = useMemo(() => ps.filter((p) => p.meta > 0), [ps]);
  const ativos = dados.lotes.filter((l) => l.qtd_atual > 0);
  const vencidos = ativos.filter((l) => alertaLote(l) === 'venc');
  const vencendo = ativos.filter((l) => ['d30', 'd60', 'd90'].includes(alertaLote(l)));
  const zerados = comMeta.filter((p) => statusProduto(dados, p) === 'red').length;
  const abMin = comMeta.filter((p) => abaixoDoMinimo(dados, p)).length;
  const conta = (s: StatusProduto) => comMeta.filter((p) => statusProduto(dados, p) === s).length;

  const rTotal = percentualReserva(dados, ['alimento', 'agua']);
  const rAlim = percentualReserva(dados, ['alimento']);
  const temApoio = comMeta.some((p) => ['higiene', 'saude', 'utilidade'].includes(p.tipo));
  const rApoio = percentualReserva(dados, ['higiene', 'saude', 'utilidade']);
  const aguas = ps.filter((p) => p.tipo === 'agua');
  const litros = soma(aguas, (p) => estoqueAtual(dados, p));
  const litrosMeta = soma(aguas, (p) => p.meta);
  const bebes = ps.filter((p) => p.tipo === 'bebe');

  // categorias com os produtos filtrados (as mais atrasadas primeiro)
  const q = busca.trim().toLowerCase();
  const categorias = useMemo(() => {
    const g: Record<string, EstoqueProduto[]> = {};
    for (const p of comMeta) {
      if (filtro !== 'todos' && statusProduto(dados, p) !== filtro) continue;
      if (q && !`${p.nome} ${p.categoria}`.toLowerCase().includes(q)) continue;
      (g[p.categoria] = g[p.categoria] || []).push(p);
    }
    const media = (l: EstoqueProduto[]) => soma(l, (p) => percentualMeta(dados, p)) / l.length;
    return Object.entries(g)
      .map(([nome, lista]) => ({ nome, lista: lista.sort((a, b) => percentualMeta(dados, a) - percentualMeta(dados, b) || a.nome.localeCompare(b.nome, 'pt-BR')) }))
      .sort((a, b) => media(a.lista) - media(b.lista) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [comMeta, dados, filtro, q]);
  const filtrando = filtro !== 'todos' || !!q;
  const estaAberta = (nome: string) => abertas[nome] ?? filtrando;
  const todasAbertas = categorias.length > 0 && categorias.every((c) => estaAberta(c.nome));
  const escolherFiltro = (f: Filtro) => {
    setFiltro(f);
    setAbertas({});
  };

  const proximasValidades = [...vencidos, ...vencendo].sort(ordemFEFO).slice(0, 6);
  const serie = (k: string, tipos: TipoMovEstoque[]) => new Set(movsAtivas(dados, tipos).filter((m) => m.data.startsWith(k)).map((m) => m.grupo)).size;
  const meses6 = ultimosMeses(6).map((k) => ({
    mes: fmtMesCurto(k),
    entradas: serie(k, ['entrada', 'reposicao']),
    consumo: serie(k, ['consumo']),
    perdas: serie(k, ['perda', 'danificado', 'descarte']),
  }));
  const temMovs = meses6.some((m) => m.entradas + m.consumo + m.perdas > 0);

  return (
    <div className="space-y-6">
      {/* ---------- faixa de abertura ---------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 px-6 py-6 text-white shadow-elevated sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 right-40 h-60 w-60 rounded-full bg-white/[0.06]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-5">
            <Anel pct={rTotal}>
              <span className="text-2xl font-bold tabular-nums">{Math.round(rTotal)}%</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-white/75">reserva</span>
            </Anel>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Gestão de Estoque Familiar</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reserva da família</h1>
              <p className="mt-1 text-sm text-white/80">Alimentos e água para 180 dias · {comMeta.length} produtos com meta</p>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:ml-auto lg:max-w-xl">
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/15">
              <p className="text-[11px] font-medium text-white/70">🌾 Alimentos</p>
              <p className="text-xl font-bold tabular-nums">{Math.round(rAlim)}%</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
                <span className="block h-full rounded-full bg-white" style={{ width: `${Math.min(100, rAlim)}%` }} />
              </div>
            </div>
            <Link href="/estoque/agua" className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/15 transition hover:bg-white/15">
              <p className="text-[11px] font-medium text-white/70">💧 Água</p>
              <p className="text-xl font-bold tabular-nums">
                {fmtQtd(litros)} <span className="text-sm font-medium text-white/70">/ {fmtQtd(litrosMeta)} L</span>
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
                <span className="block h-full rounded-full bg-sky-200" style={{ width: `${litrosMeta ? Math.min(100, (litros / litrosMeta) * 100) : 0}%` }} />
              </div>
            </Link>
            <div className="col-span-2 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/15 sm:col-span-1">
              <p className="truncate text-[11px] font-medium text-white/70">{temApoio ? '🧻 Higiene, saúde e utilidades' : '📦 Lotes ativos'}</p>
              <p className="text-xl font-bold tabular-nums">{temApoio ? `${Math.round(rApoio)}%` : ativos.length}</p>
              <p className="text-[11px] text-white/70">{temApoio ? `${ativos.length} lotes ativos` : 'com estoque'}</p>
            </div>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => abrir({ tipo: 'entrada' })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-soft transition hover:bg-emerald-50"
          >
            <IconPlus className="h-4 w-4" /> Registrar entrada
          </button>
          <button
            type="button"
            onClick={() => abrir({ tipo: 'saida' })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25"
          >
            <IconMenos className="h-4 w-4" /> Registrar saída
          </button>
          <Link
            href="/estoque/compras"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25"
          >
            <IconCarrinho className="h-4 w-4" /> Lista de compras{dados.lista?.length ? ` (${dados.lista.length})` : ''}
          </Link>
        </div>
      </section>

      {/* ---------- atenção ---------- */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Atencao href="/estoque/lotes?alerta=venc" valor={vencidos.length} rotulo="Lotes vencidos" cor="bg-red-50 text-red-600" ok="nenhum vencido" />
        <Atencao href="/estoque/lotes?alerta=proximos" valor={vencendo.length} rotulo="Vencem em até 90 dias" cor="bg-orange-50 text-orange-600" ok="nada vencendo" />
        <Atencao href="/estoque/produtos?status=red" valor={zerados} rotulo="Produtos sem estoque" cor="bg-red-50 text-red-600" ok="todos têm estoque" />
        <Atencao href="/estoque/produtos?status=min" valor={abMin} rotulo="Abaixo do mínimo" cor="bg-amber-50 text-amber-600" ok="todos acima do mínimo" />
      </section>

      {!dados.lotes.length && (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 px-5 py-4 text-sm text-emerald-900">
          <b>Comece registrando o que vocês já têm em casa.</b> Use <b>Registrar entrada</b> para cada produto, com validade e lote. Se você usava a versão offline, importe o backup em{' '}
          <Link href="/estoque/configuracoes" className="font-semibold underline">
            Configurações
          </Link>
          .
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ---------- metas por categoria ---------- */}
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-base font-semibold text-gray-900">Metas por categoria</h2>
            <div className="relative w-full sm:w-auto">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="input-field !w-full !py-1.5 !pl-9 text-sm sm:!w-48" placeholder="Buscar produto…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {FILTROS.map((f) => {
              const n = f.id === 'todos' ? comMeta.length : conta(f.id);
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
                className="ml-auto text-xs font-semibold text-brand-600 hover:underline"
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
                  produtos={c.lista}
                  aberto={estaAberta(c.nome)}
                  alternar={() => setAbertas((a) => ({ ...a, [c.nome]: !estaAberta(c.nome) }))}
                />
              ))}
            </div>
          ) : (
            <Secao>
              <Vazio>{comMeta.length ? 'Nenhum produto com esse filtro.' : 'Defina metas nos produtos para acompanhar aqui.'}</Vazio>
            </Secao>
          )}
        </section>

        {/* ---------- coluna lateral ---------- */}
        <aside className="space-y-6">
          <Secao titulo="Próximas validades" extra={<Link href="/estoque/lotes" className="text-xs font-semibold text-brand-600">Ver todas</Link>} semPadding>
            {proximasValidades.length ? (
              <ul className="divide-y divide-gray-50">
                {proximasValidades.map((l) => {
                  const p = ps.find((x) => x.id === l.produto_id);
                  const a = alertaLote(l);
                  const venc = a === 'venc';
                  const cor = venc || a === 'd30' ? 'bg-red-50 text-red-700' : a === 'd60' ? 'bg-orange-50 text-orange-700' : 'bg-amber-50 text-amber-700';
                  return (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`flex w-14 shrink-0 flex-col items-center rounded-xl py-1 ${cor}`}>
                        <span className="text-sm font-bold leading-tight tabular-nums">{fmtData(l.validade).slice(0, 5)}</span>
                        <span className="text-[10px] leading-tight">{fmtData(l.validade).slice(6)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{p?.nome}</span>
                        <span className="block truncate text-xs text-gray-500">
                          {fmtQtd(l.qtd_atual)} {p?.unidade} · {textoPrazo(l)}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="btn-secondary shrink-0 !px-2.5 !py-1 text-xs"
                        onClick={() => abrir({ tipo: 'saida', loteId: l.id, tipoSaida: venc ? 'descarte' : 'consumo' })}
                      >
                        {venc ? 'Descartar' : 'Consumir'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-3xl" aria-hidden>
                  ✅
                </p>
                <p className="mt-1 text-sm text-gray-500">Nada vencido ou vencendo nos próximos 90 dias.</p>
              </div>
            )}
          </Secao>

          <Secao titulo="Situação dos produtos" extra={<span className="text-xs text-gray-400">clique para filtrar</span>}>
            <div className="space-y-3">
              {(
                [
                  ['green', 'Completos', 'bg-emerald-500'],
                  ['amber', 'Abaixo da meta', 'bg-amber-500'],
                  ['red', 'Sem estoque', 'bg-red-500'],
                ] as const
              ).map(([s, rotulo, cor]) => {
                const n = conta(s);
                return (
                  <button key={s} type="button" onClick={() => escolherFiltro(s)} className="block w-full rounded-lg text-left transition hover:opacity-80">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-700">
                        <span className={`h-2.5 w-2.5 rounded-full ${cor}`} /> {rotulo}
                      </span>
                      <b className="tabular-nums text-gray-900">{n}</b>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <span className={`block h-full rounded-full ${cor}`} style={{ width: `${comMeta.length ? (n / comMeta.length) * 100 : 0}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Secao>

          {bebes.length > 0 && (
            <Link href="/estoque/bebe" className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-soft transition hover:shadow-card">
              <span className="text-2xl" aria-hidden>
                🍼
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">Alimentação do bebê</span>
                <span className="block truncate text-xs text-gray-500">{bebes.map((p) => `${p.nome}: ${fmtQtd(estoqueAtual(dados, p))} ${p.unidade}`).join(' · ')}</span>
              </span>
              <StatusBadge status={statusProduto(dados, bebes[0])} />
            </Link>
          )}
        </aside>
      </div>

      {/* ---------- movimentações ---------- */}
      <Secao titulo="Movimentações por mês" extra={<Link href="/estoque/movimentacoes" className="text-xs font-semibold text-brand-600">Histórico</Link>}>
        {temMovs ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses6} barGap={2}>
                <CartesianGrid vertical={false} stroke="#eef1f4" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                <Tooltip cursor={{ fill: '#f6f8fa' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entradas" name="Entradas" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="consumo" name="Consumo" fill="#7c9cc9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="perdas" name="Perdas e descartes" fill="#ea580c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Vazio>As entradas e saídas registradas aparecem aqui, mês a mês.</Vazio>
        )}
      </Secao>
    </div>
  );
}
