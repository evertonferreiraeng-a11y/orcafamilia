'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { CabecalhoEstoque } from '@/components/estoque/Cabecalho';
import { AlertaBadge, Aviso, BotaoIcone, Kpi, Secao, TD, TDN, TH, THN, Tabela, Vazio } from '@/components/estoque/ui';
import { IconEdit, IconMenos } from '@/components/icons';
import { ALERTA_LABEL, alertaLote, fmtConteudo, fmtData, fmtQtd, medidaDoProduto, loteVencido, ordemFEFO, ordenarPorNome, textoPrazo, type AlertaLote } from '@/lib/estoque/calc';
import type { EstoqueLote } from '@/types/database';

export function TabelaLotes({ lotes, agua }: { lotes: EstoqueLote[]; agua?: boolean }) {
  const { dados, abrir } = useEstoque();
  if (!lotes.length) return <Vazio>Nenhum lote encontrado. Lotes são criados ao registrar uma entrada.</Vazio>;
  return (
    <Tabela minW={1100}>
      <thead>
        <tr>
          {!agua && <th className={TH}>Produto</th>}
          <th className={TH}>Lote</th>
          {agua && <th className={THN}>Capacidade</th>}
          {agua && <th className={THN}>Garrafas</th>}
          <th className={THN}>Qtd. atual</th>
          <th className={THN}>Comprado</th>
          <th className={TH}>Compra</th>
          {!agua && <th className={TH}>Fabricação</th>}
          <th className={TH}>Validade</th>
          <th className={THN}>Prazo</th>
          <th className={TH}>Situação</th>
          <th className={TH}>Local</th>
          <th className={TH}>Fornecedor</th>
          <th className={TH} />
        </tr>
      </thead>
      <tbody>
        {lotes.map((l) => {
          const p = dados.produtos.find((x) => x.id === l.produto_id);
          const cap = l.cap || p?.cap || 5;
          return (
            <tr key={l.id} className="hover:bg-gray-50/60">
              {!agua && <td className={`${TD} font-semibold text-gray-900`}>{p?.nome}</td>}
              <td className={TD}>{l.num_lote || '—'}</td>
              {agua && <td className={TDN}>{fmtQtd(cap)} L</td>}
              {agua && (
                <td className={TDN}>
                  <b>{fmtQtd(Math.round((l.qtd_atual / cap) * 100) / 100)}</b>
                </td>
              )}
              <td className={TDN}>
                <b className={l.qtd_atual < 0 ? 'text-negative' : ''}>{fmtQtd(l.qtd_atual)}</b> {p?.unidade}
                {l.emb_conteudo && l.emb_unidade ? (
                  <p className="text-xs font-normal text-gray-400">
                    {fmtConteudo(l.emb_conteudo, l.emb_unidade)} cada
                    {p && !medidaDoProduto(p.unidade) && l.qtd_atual > 0 ? ` · ${fmtConteudo(l.qtd_atual * l.emb_conteudo, l.emb_unidade)}` : ''}
                  </p>
                ) : null}
              </td>
              <td className={TDN}>{fmtQtd(l.qtd_inicial)}</td>
              <td className={TD}>{fmtData(l.data_compra)}</td>
              {!agua && <td className={TD}>{fmtData(l.data_fab)}</td>}
              <td className={`${TD} font-semibold`}>{fmtData(l.validade)}</td>
              <td className={TDN}>{textoPrazo(l)}</td>
              <td className={TD}>
                <AlertaBadge lote={l} />
              </td>
              <td className={TD}>{dados.locais.find((x) => x.id === l.local_id)?.nome ?? '—'}</td>
              <td className={TD}>{l.fornecedor || '—'}</td>
              <td className={TD}>
                <div className="flex justify-end gap-0.5">
                  {l.qtd_atual > 0 && (
                    <BotaoIcone titulo="Saída deste lote" onClick={() => abrir({ tipo: 'saida', loteId: l.id, tipoSaida: loteVencido(l) ? 'descarte' : 'consumo' })}>
                      <IconMenos className="h-4 w-4" />
                    </BotaoIcone>
                  )}
                  <BotaoIcone titulo="Editar lote / contagem" onClick={() => abrir({ tipo: 'lote', id: l.id })}>
                    <IconEdit className="h-4 w-4" />
                  </BotaoIcone>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Tabela>
  );
}

export function LotesEstoque() {
  const { dados } = useEstoque();
  const params = useSearchParams();
  const [pid, setPid] = useState(params.get('produto') ?? '');
  const [al, setAl] = useState<'' | AlertaLote | 'proximos'>((params.get('alerta') as AlertaLote | 'proximos' | null) ?? '');
  const [zerados, setZerados] = useState(false);
  const ativos = dados.lotes.filter((l) => l.qtd_atual > 0);
  const conta = (a: AlertaLote) => ativos.filter((l) => alertaLote(l) === a).length;
  const lista = dados.lotes
    .filter(
      (l) =>
        (!pid || l.produto_id === pid) &&
        (zerados || l.qtd_atual !== 0) &&
        (!al || (al === 'proximos' ? ['d30', 'd60', 'd90'].includes(alertaLote(l)) : alertaLote(l) === al))
    )
    .sort(ordemFEFO);

  return (
    <div>
      <CabecalhoEstoque titulo="Validade e lotes" descricao="Controle individual por lote, com alertas de 90, 60 e 30 dias" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi titulo="Vencidos" valor={conta('venc')} tom="vermelho" sub="descartar ou verificar" />
        <Kpi titulo="Até 30 dias" valor={conta('d30')} tom="vermelho" sub="consumir primeiro" />
        <Kpi titulo="Até 60 dias" valor={conta('d60')} tom="laranja" sub="priorizar consumo" />
        <Kpi titulo="Até 90 dias" valor={conta('d90')} tom="amarelo" sub="acompanhar" />
        <Kpi titulo="Lotes ativos" valor={ativos.length} tom="azul" sub={`${conta('none')} sem validade informada`} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input-field !w-auto" value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">Todos os produtos</option>
          {[...dados.produtos].sort(ordenarPorNome).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <select className="input-field !w-auto" value={al} onChange={(e) => setAl(e.target.value as typeof al)}>
          <option value="">Todas as situações</option>
          <option value="proximos">Vencendo em até 90 dias</option>
          {(Object.keys(ALERTA_LABEL) as AlertaLote[]).map((k) => (
            <option key={k} value={k}>
              {ALERTA_LABEL[k]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-500" checked={zerados} onChange={(e) => setZerados(e.target.checked)} />
          Mostrar lotes zerados
        </label>
      </div>
      <Aviso tom="azul">
        Ordenado por <b>FEFO</b> (primeiro a vencer, primeiro a sair). As saídas automáticas consomem os lotes nesta ordem e nunca usam lotes vencidos para consumo.
      </Aviso>
      <Secao semPadding>
        <TabelaLotes lotes={lista} />
      </Secao>
    </div>
  );
}
