'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { CabecalhoEstoque } from '@/components/estoque/Cabecalho';
import { Badge, Barra, Kpi, Secao, TD, TDN, TH, THN, Tabela, Vazio } from '@/components/estoque/ui';
import {
  comparacaoPrecos,
  compras,
  fmtData,
  fmtMesCurto,
  fmtMesLongo,
  fmtMoeda,
  fmtPct,
  fmtQtd,
  gastoNoMes,
  hojeISO,
  movsAtivas,
  precoUnitario,
  r2,
  reposicao,
  soma,
  ultimosMeses,
  valorEmEstoque,
} from '@/lib/estoque/calc';

export function FinanceiroEstoque() {
  const { dados } = useEstoque();
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const cfg = dados.config;
  const cs = compras(dados);
  const gasto = gastoNoMes(dados, mes);
  const investido = soma(cs, (m) => m.valor);
  const valorEst = soma(dados.lotes, valorEmEstoque);
  const custoRep = soma(dados.produtos.filter((p) => p.meta > 0), (p) => reposicao(dados, p) * precoUnitario(dados, p));
  const catTotal: Record<string, number> = {};
  const catMes: Record<string, number> = {};
  for (const m of cs) {
    const c = dados.produtos.find((p) => p.id === m.produto_id)?.categoria || 'Sem categoria';
    catTotal[c] = (catTotal[c] || 0) + m.valor;
    if (m.data.startsWith(mes)) catMes[c] = (catMes[c] || 0) + m.valor;
  }
  const cats = Object.keys(catTotal).sort((a, b) => catTotal[b] - catTotal[a]);
  const doMes = cs.filter((m) => m.data.startsWith(mes)).sort((a, b) => b.data.localeCompare(a.data));
  const precos = comparacaoPrecos(dados);
  const tomGasto = gasto > cfg.orc_max ? 'vermelho' : gasto >= cfg.orc_min ? 'verde' : 'azul';

  return (
    <div>
      <CabecalhoEstoque titulo="Financeiro do estoque" descricao="Orçamento mensal, investimento, gastos por categoria e comparação de preços">
        <input type="month" className="input-field !w-auto" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} aria-label="Mês de referência" />
      </CabecalhoEstoque>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi titulo={`Gasto em ${fmtMesLongo(mes)}`} valor={fmtMoeda(gasto)} tom={gasto > cfg.orc_max ? 'vermelho' : 'verde'} sub={`${doMes.length} compra(s)`} />
        <Kpi
          titulo="Orçamento mensal"
          valor={`${fmtMoeda(cfg.orc_min)} – ${fmtMoeda(cfg.orc_max)}`}
          tom="azul"
          sub={gasto > cfg.orc_max ? <span className="text-negative">ultrapassou em {fmtMoeda(gasto - cfg.orc_max)}</span> : `saldo até o máximo: ${fmtMoeda(cfg.orc_max - gasto)}`}
        />
        <Kpi titulo="Total investido" valor={fmtMoeda(investido)} tom="azul" sub="todas as compras registradas" />
        <Kpi titulo="Valor em estoque" valor={fmtMoeda(valorEst)} tom="verde" sub="custo dos itens ainda guardados" />
        <Kpi titulo="Custo de reposição" valor={fmtMoeda(custoRep)} tom="amarelo" sub={cfg.orc_max > 0 ? `≈ ${Math.ceil(custoRep / cfg.orc_max)} mês(es) no orçamento máximo` : ''} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Secao titulo={`Controle do orçamento – ${fmtMesLongo(mes)}`} extra={<Link href="/estoque/configuracoes" className="text-xs font-semibold text-brand-600">Alterar orçamento</Link>}>
          <div className="mb-2 flex justify-between text-sm">
            <span>
              Gasto: <b>{fmtMoeda(gasto)}</b>
            </span>
            <span className="text-gray-400">máximo {fmtMoeda(cfg.orc_max)}</span>
          </div>
          <div className="relative">
            <Barra pct={cfg.orc_max ? (gasto / cfg.orc_max) * 100 : 0} tom={tomGasto} grossa />
            {cfg.orc_max > 0 && <div title="Orçamento mínimo" className="absolute -bottom-1 -top-1 w-0.5 bg-gray-900" style={{ left: `${Math.min(100, (cfg.orc_min / cfg.orc_max) * 100)}%` }} />}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            A marca escura indica o mínimo planejado ({fmtMoeda(cfg.orc_min)}).{' '}
            {gasto < cfg.orc_min ? `Faltam ${fmtMoeda(cfg.orc_min - gasto)} para atingir o mínimo.` : gasto <= cfg.orc_max ? 'Dentro da faixa planejada.' : 'Acima do orçamento.'}
          </p>
        </Secao>
        <Secao titulo="Gastos por categoria" semPadding>
          {cats.length ? (
            <Tabela minW={420}>
              <thead>
                <tr>
                  <th className={TH}>Categoria</th>
                  <th className={THN}>{fmtMesCurto(mes)}</th>
                  <th className={THN}>Total</th>
                  <th className={`${TH} w-1/3`} />
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => (
                  <tr key={c}>
                    <td className={TD}>{c}</td>
                    <td className={TDN}>{fmtMoeda(catMes[c] || 0)}</td>
                    <td className={TDN}>
                      <b>{fmtMoeda(catTotal[c])}</b>
                    </td>
                    <td className={TD}>
                      <Barra pct={(catTotal[c] / catTotal[cats[0]]) * 100} tom="azul" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          ) : (
            <Vazio>Sem compras registradas.</Vazio>
          )}
        </Secao>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Secao titulo="Relatório mensal" extra={<span className="text-xs text-gray-400">últimos 12 meses</span>} semPadding>
          <Tabela minW={520}>
            <thead>
              <tr>
                <th className={TH}>Mês</th>
                <th className={THN}>Compras</th>
                <th className={THN}>Nº</th>
                <th className={THN}>Consumo (est.)</th>
                <th className={THN}>Perdas (est.)</th>
                <th className={TH}>Orçamento</th>
              </tr>
            </thead>
            <tbody>
              {ultimosMeses(12)
                .reverse()
                .map((k) => {
                  const g = gastoNoMes(dados, k);
                  const cons = r2(soma(movsAtivas(dados, ['consumo']).filter((m) => m.data.startsWith(k)), (m) => m.valor));
                  const per = r2(soma(movsAtivas(dados, ['perda', 'danificado', 'descarte']).filter((m) => m.data.startsWith(k)), (m) => m.valor));
                  return (
                    <tr key={k}>
                      <td className={TD}>{fmtMesCurto(k)}</td>
                      <td className={TDN}>
                        <b>{fmtMoeda(g)}</b>
                      </td>
                      <td className={TDN}>{cs.filter((m) => m.data.startsWith(k)).length}</td>
                      <td className={TDN}>{fmtMoeda(cons)}</td>
                      <td className={TDN}>{fmtMoeda(per)}</td>
                      <td className={TD}>
                        {g === 0 ? (
                          <Badge tom="cinza">Sem compras</Badge>
                        ) : g > cfg.orc_max ? (
                          <Badge tom="vermelho">Acima</Badge>
                        ) : g >= cfg.orc_min ? (
                          <Badge tom="verde">Na faixa</Badge>
                        ) : (
                          <Badge tom="azul">Abaixo do mín.</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </Tabela>
        </Secao>
        <Secao titulo={`Compras de ${fmtMesLongo(mes)}`} semPadding>
          {doMes.length ? (
            <Tabela minW={480}>
              <thead>
                <tr>
                  <th className={TH}>Data</th>
                  <th className={TH}>Produto</th>
                  <th className={THN}>Qtd.</th>
                  <th className={THN}>Valor</th>
                  <th className={TH}>Fornecedor</th>
                </tr>
              </thead>
              <tbody>
                {doMes.map((m) => {
                  const p = dados.produtos.find((x) => x.id === m.produto_id);
                  const l = dados.lotes.find((x) => x.id === m.lote_id);
                  return (
                    <tr key={m.id}>
                      <td className={TD}>{fmtData(m.data)}</td>
                      <td className={TD}>{p?.nome}</td>
                      <td className={TDN}>
                        {fmtQtd(m.qtd)} {p?.unidade}
                      </td>
                      <td className={TDN}>{fmtMoeda(m.valor)}</td>
                      <td className={TD}>{l?.fornecedor || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabela>
          ) : (
            <Vazio>Nenhuma compra neste mês.</Vazio>
          )}
        </Secao>
      </div>

      <Secao titulo="Comparação de preços (por unidade)" extra={<span className="text-xs text-gray-400">com base nas compras registradas</span>} semPadding>
        {precos.length ? (
          <Tabela minW={900}>
            <thead>
              <tr>
                <th className={TH}>Produto</th>
                <th className={THN}>Compras</th>
                <th className={THN}>Último</th>
                <th className={THN}>Anterior</th>
                <th className={THN}>Variação</th>
                <th className={THN}>Menor</th>
                <th className={THN}>Maior</th>
                <th className={THN}>Média</th>
                <th className={TH}>Último fornecedor</th>
              </tr>
            </thead>
            <tbody>
              {precos.map((x) => (
                <tr key={x.produto.id}>
                  <td className={`${TD} font-semibold`}>
                    {x.produto.nome} <span className="text-xs font-normal text-gray-400">/{x.produto.unidade}</span>
                  </td>
                  <td className={TDN}>{x.n}</td>
                  <td className={TDN}>
                    <b>{fmtMoeda(x.ultimo.v)}</b>
                    <p className="text-xs text-gray-400">{fmtData(x.ultimo.data)}</p>
                  </td>
                  <td className={TDN}>{x.anterior ? fmtMoeda(x.anterior.v) : '—'}</td>
                  <td className={TDN}>
                    {x.variacao === null ? '—' : <b className={x.variacao > 0 ? 'text-negative' : x.variacao < 0 ? 'text-positive' : ''}>{`${x.variacao > 0 ? '+' : ''}${fmtPct(x.variacao)}`}</b>}
                  </td>
                  <td className={TDN}>
                    {fmtMoeda(x.menor.v)}
                    <p className="text-xs text-gray-400">{x.menor.f}</p>
                  </td>
                  <td className={TDN}>
                    {fmtMoeda(x.maior.v)}
                    <p className="text-xs text-gray-400">{x.maior.f}</p>
                  </td>
                  <td className={TDN}>{fmtMoeda(x.media)}</td>
                  <td className={TD}>{x.ultimo.f || '—'}</td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        ) : (
          <Vazio>Registre compras com valor pago para comparar preços.</Vazio>
        )}
      </Secao>
    </div>
  );
}
