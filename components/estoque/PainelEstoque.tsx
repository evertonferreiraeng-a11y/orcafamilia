'use client';

import Link from 'next/link';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { CabecalhoEstoque } from '@/components/estoque/Cabecalho';
import { AlertaBadge, Aviso, Barra, Kpi, Secao, StatusBadge, Vazio } from '@/components/estoque/ui';
import {
  abaixoDoMinimo,
  alertaLote,
  estoqueAtual,
  fmtData,
  fmtMesCurto,
  fmtPct,
  fmtQtd,
  movsAtivas,
  ordemFEFO,
  percentualMeta,
  percentualReserva,
  soma,
  statusProduto,
  textoPrazo,
  ultimosMeses,
} from '@/lib/estoque/calc';
import type { TipoMovEstoque } from '@/types/database';


export function PainelEstoque() {
  const { dados, abrir } = useEstoque();
  const ps = dados.produtos;
  const comMeta = ps.filter((p) => p.meta > 0);
  const completos = comMeta.filter((p) => statusProduto(dados, p) === 'green').length;
  const abaixo = comMeta.filter((p) => statusProduto(dados, p) === 'amber').length;
  const zerados = comMeta.filter((p) => statusProduto(dados, p) === 'red').length;
  const abMin = comMeta.filter((p) => abaixoDoMinimo(dados, p)).length;
  const ativos = dados.lotes.filter((l) => l.qtd_atual > 0);
  const proximos = ativos.filter((l) => ['d30', 'd60', 'd90'].includes(alertaLote(l)));
  const vencidos = ativos.filter((l) => alertaLote(l) === 'venc');
  const rTotal = percentualReserva(dados, ['alimento', 'agua']);
  const rAlim = percentualReserva(dados, ['alimento']);
  const aguas = ps.filter((p) => p.tipo === 'agua');
  const litros = soma(aguas, (p) => estoqueAtual(dados, p));
  const litrosMeta = soma(aguas, (p) => p.meta);
  const bebes = ps.filter((p) => p.tipo === 'bebe');

  // situação dos produtos com meta
  const fatias = [
    { nome: 'Completo', valor: completos, cor: '#059669' },
    { nome: 'Abaixo da meta', valor: abaixo, cor: '#f59e0b' },
    { nome: 'Sem estoque', valor: zerados, cor: '#ef4444' },
  ].filter((f) => f.valor > 0);

  const metas = comMeta.map((p) => ({ p, pct: percentualMeta(dados, p) * 100 })).sort((a, b) => a.pct - b.pct);
  // nº de movimentações por mês (cada saída FEFO em vários lotes conta uma vez)
  const serie = (k: string, tipos: TipoMovEstoque[]) => new Set(movsAtivas(dados, tipos).filter((m) => m.data.startsWith(k)).map((m) => m.grupo)).size;
  const meses6 = ultimosMeses(6).map((k) => ({
    mes: fmtMesCurto(k),
    entradas: serie(k, ['entrada', 'reposicao']),
    consumo: serie(k, ['consumo']),
    perdas: serie(k, ['perda', 'danificado', 'descarte']),
  }));
  const alertas = [...vencidos, ...proximos].sort(ordemFEFO).slice(0, 8);

  return (
    <div>
      <CabecalhoEstoque titulo="Painel" descricao="Reserva estratégica de alimentos e água da família – meta de 180 dias" />

      {!dados.lotes.length && (
        <Aviso
          tom="azul"
          acao={
            <Link href="/estoque/compras" className="btn-secondary">
              Abrir lista de compras
            </Link>
          }
        >
          <b>Comece registrando o que vocês já têm em casa.</b> Use <b>Entrada</b> para cada produto (com validade e lote) ou dê entrada em vários itens pela lista de
          compras. Se você usava a versão offline, importe o backup em <Link href="/estoque/configuracoes" className="underline">Configurações</Link>.
        </Aviso>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi titulo="Reserva total (alimentos + água)" valor={fmtPct(rTotal)} tom="verde" sub={<Barra pct={rTotal} />} />
        <Kpi titulo="Reserva alimentar" valor={fmtPct(rAlim)} tom="verde" sub={<Barra pct={rAlim} />} />
        <Kpi
          titulo="Água disponível"
          valor={`${fmtQtd(litros)} L`}
          tom="azul"
          sub={
            <>
              de {fmtQtd(litrosMeta)} L
              <div className="mt-1">
                <Barra pct={litrosMeta ? (litros / litrosMeta) * 100 : 0} tom="azul" />
              </div>
            </>
          }
        />
        <Kpi titulo="Produtos cadastrados" valor={ps.length} tom="azul" sub={`${comMeta.length} com meta definida`} />
        <Kpi titulo="Estoque completo" valor={completos} tom="verde" sub="atingiram a meta" />
        <Kpi titulo="Abaixo da meta" valor={abaixo} tom="amarelo" sub={abMin ? `${abMin} no total abaixo do mínimo de segurança` : 'precisam de reposição'} />
        <Kpi titulo="Sem estoque" valor={zerados} tom="vermelho" sub="produtos zerados" />
        <Kpi titulo="Próximos do vencimento" valor={proximos.length} tom="laranja" sub="lotes em até 90 dias" />
        <Kpi titulo="Vencidos" valor={vencidos.length} tom="vermelho" sub={vencidos.length ? <Link href="/estoque/lotes" className="underline">registrar descarte</Link> : 'nenhum lote vencido'} />
        <Kpi titulo="Lotes ativos" valor={ativos.length} tom="azul" sub={<Link href="/estoque/lotes" className="underline">ver validades</Link>} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Secao titulo="Situação dos produtos" extra={<span className="text-xs text-gray-400">{comMeta.length} com meta</span>}>
          {fatias.length ? (
            <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fatias} dataKey="valor" nameKey="nome" innerRadius={50} outerRadius={80} paddingAngle={1}>
                      {fatias.map((f) => (
                        <Cell key={f.nome} fill={f.cor} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v} produto(s)`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-sm">
                {fatias.map((f) => (
                  <li key={f.nome} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: f.cor }} />
                    <span className="flex-1 truncate">{f.nome}</span>
                    <b className="tabular-nums">{f.valor}</b>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Vazio>Defina metas nos produtos para ver a situação.</Vazio>
          )}
        </Secao>

        <Secao titulo="Alertas de validade" extra={<Link href="/estoque/lotes" className="text-xs font-semibold text-brand-600">Ver todos</Link>} semPadding>
          {alertas.length ? (
            <ul>
              {alertas.map((l) => {
                const p = ps.find((x) => x.id === l.produto_id);
                const venc = alertaLote(l) === 'venc';
                return (
                  <li key={l.id} className="flex items-center gap-3 border-b border-gray-50 px-4 py-2.5 last:border-0">
                    <AlertaBadge lote={l} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{p?.nome}</p>
                      <p className="text-xs text-gray-500">
                        {fmtQtd(l.qtd_atual)} {p?.unidade} · lote {l.num_lote || 's/ nº'} · validade {fmtData(l.validade)} ({textoPrazo(l)})
                      </p>
                    </div>
                    <button type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => abrir({ tipo: 'saida', loteId: l.id, tipoSaida: venc ? 'descarte' : 'consumo' })}>
                      {venc ? 'Descartar' : 'Consumir'}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vazio>Nenhum lote vencido ou vencendo nos próximos 90 dias.</Vazio>
          )}
        </Secao>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Secao titulo="Percentual de conclusão das metas">
          {metas.length ? (
            <div className="space-y-2.5">
              {metas.map(({ p, pct }) => (
                <div key={p.id} className="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-sm sm:grid-cols-[160px_1fr_48px]">
                  <span className="truncate" title={p.nome}>
                    {p.nome}
                  </span>
                  <Barra pct={pct} tom={pct >= 100 ? 'verde' : p.tipo === 'agua' ? 'azul' : pct > 0 ? 'amarelo' : 'cinza'} />
                  <span className="text-right font-semibold tabular-nums">{Math.round(pct)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <Vazio>Defina metas nos produtos.</Vazio>
          )}
        </Secao>
        <div className="grid content-start gap-4">
          <Secao titulo="Movimentações por mês" extra={<span className="text-xs text-gray-400">nº de registros · 6 meses</span>}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={meses6}>
                  <CartesianGrid vertical={false} stroke="#eef1f4" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="entradas" name="Entradas/reposição" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consumo" name="Consumo" fill="#7c9cc9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="perdas" name="Perdas e descartes" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Secao>
        </div>
      </div>

      {bebes.length > 0 && (
        <Secao titulo="Alimentação do bebê (controle separado)" extra={<Link href="/estoque/bebe" className="text-xs font-semibold text-brand-600">Abrir</Link>}>
          {bebes.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-1 text-sm">
              <b className="flex-1">{p.nome}</b>
              <span>
                {fmtQtd(estoqueAtual(dados, p))} {p.unidade}
                {p.meta > 0 && ` de ${fmtQtd(p.meta)}`}
              </span>
              <StatusBadge status={statusProduto(dados, p)} />
            </div>
          ))}
        </Secao>
      )}
    </div>
  );
}
