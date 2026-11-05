'use client';

import { useState } from 'react';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { CabecalhoEstoque } from '@/components/estoque/Cabecalho';
import { Badge, BotaoIcone, Secao, TD, TDN, TH, THN, Tabela, Vazio, type Tom } from '@/components/estoque/ui';
import { IconDesfazer } from '@/components/icons';
import { SAIDAS, TIPOS_MOV, fmtData, fmtMoeda, fmtQtd, ordenarPorNome } from '@/lib/estoque/calc';
import type { EstoqueMov, TipoMovEstoque } from '@/types/database';

const TOM_MOV: Record<TipoMovEstoque, Tom> = {
  entrada: 'verde',
  reposicao: 'azul',
  consumo: 'cinza',
  perda: 'laranja',
  danificado: 'laranja',
  descarte: 'vermelho',
  ajuste: 'amarelo',
};
const LIMITE = 400;

export function MovimentacoesEstoque() {
  const { dados, abrir, confirmar, rpc, avisar } = useEstoque();
  const [tipo, setTipo] = useState<'' | TipoMovEstoque | 'saidas'>('');
  const [pid, setPid] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const lista = dados.movs
    .filter(
      (m) =>
        (!tipo || (tipo === 'saidas' ? SAIDAS.includes(m.tipo as (typeof SAIDAS)[number]) : m.tipo === tipo)) &&
        (!pid || m.produto_id === pid) &&
        (!de || m.data >= de) &&
        (!ate || m.data <= ate)
    )
    .sort((a, b) => b.data.localeCompare(a.data) || b.criado_em.localeCompare(a.criado_em));

  async function estornar(m: EstoqueMov) {
    const p = dados.produtos.find((x) => x.id === m.produto_id);
    const entrada = m.tipo === 'entrada' || m.tipo === 'reposicao';
    const ok = await confirmar({
      titulo: 'Estornar movimentação',
      ok: 'Estornar',
      mensagem: (
        <>
          Estornar <b>{TIPOS_MOV[m.tipo]}</b> de <b>{fmtQtd(Math.abs(m.qtd))} {p?.unidade}</b> de {p?.nome} em {fmtData(m.data)}?
          <p className="mt-2">{entrada ? 'O lote criado por esta entrada será removido.' : 'A quantidade voltará ao lote.'}</p>
        </>
      ),
    });
    if (!ok) return;
    try {
      await rpc('estoque_estornar', { p_mov: m.id });
      avisar('Movimentação estornada.');
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }

  return (
    <div>
      <CabecalhoEstoque titulo="Movimentações" descricao="Entradas, consumo, reposição, perdas, danificados e descartes" />
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'saida', tipoSaida: 'consumo' })}>
          Saída para consumo
        </button>
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'saida', tipoSaida: 'perda' })}>
          Perda / danificado
        </button>
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'saida', tipoSaida: 'descarte' })}>
          Descarte por vencimento
        </button>
      </div>
      <Secao
        titulo="Histórico completo"
        semPadding
        extra={
          <div className="flex flex-wrap gap-2">
            <select className="input-field !w-auto !py-1.5" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
              <option value="">Todos os tipos</option>
              <option value="saidas">Todas as saídas</option>
              {(Object.keys(TIPOS_MOV) as TipoMovEstoque[]).map((k) => (
                <option key={k} value={k}>
                  {TIPOS_MOV[k]}
                </option>
              ))}
            </select>
            <select className="input-field !w-auto !py-1.5" value={pid} onChange={(e) => setPid(e.target.value)}>
              <option value="">Todos os produtos</option>
              {[...dados.produtos].sort(ordenarPorNome).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <input type="date" className="input-field !w-auto !py-1.5" title="De" value={de} onChange={(e) => setDe(e.target.value)} />
            <input type="date" className="input-field !w-auto !py-1.5" title="Até" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        }
      >
        {lista.length ? (
          <>
            <Tabela minW={900}>
              <thead>
                <tr>
                  <th className={TH}>Data</th>
                  <th className={TH}>Tipo</th>
                  <th className={TH}>Produto</th>
                  <th className={TH}>Lote</th>
                  <th className={THN}>Quantidade</th>
                  <th className={THN}>Valor</th>
                  <th className={TH}>Observações</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody>
                {lista.slice(0, LIMITE).map((m) => {
                  const p = dados.produtos.find((x) => x.id === m.produto_id);
                  const l = dados.lotes.find((x) => x.id === m.lote_id);
                  const sinal = m.tipo === 'ajuste' ? (m.qtd > 0 ? '+' : '') : SAIDAS.includes(m.tipo as (typeof SAIDAS)[number]) ? '−' : '+';
                  const neg = sinal === '−' || (m.tipo === 'ajuste' && m.qtd < 0);
                  return (
                    <tr key={m.id} className={m.estornado ? 'text-gray-400 line-through' : 'hover:bg-gray-50/60'}>
                      <td className={TD}>{fmtData(m.data)}</td>
                      <td className={TD}>
                        <Badge tom={TOM_MOV[m.tipo]} ponto={false}>
                          {TIPOS_MOV[m.tipo]}
                        </Badge>
                        {m.estornado && <span className="ml-1 text-xs no-underline">(estornado)</span>}
                      </td>
                      <td className={`${TD} font-semibold`}>{p?.nome ?? '(produto excluído)'}</td>
                      <td className={TD}>{l ? l.num_lote || `validade ${fmtData(l.validade)}` : '—'}</td>
                      <td className={TDN}>
                        <b className={m.estornado ? '' : neg ? 'text-negative' : 'text-positive'}>
                          {sinal}
                          {fmtQtd(Math.abs(m.qtd))}
                        </b>{' '}
                        {p?.unidade}
                      </td>
                      <td className={TDN}>{m.valor ? fmtMoeda(Math.abs(m.valor)) : '—'}</td>
                      <td className={`${TD} max-w-[260px]`}>{m.obs}</td>
                      <td className={TD}>
                        {!m.estornado && (
                          <BotaoIcone titulo="Estornar (desfazer)" onClick={() => estornar(m)}>
                            <IconDesfazer className="h-4 w-4" />
                          </BotaoIcone>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabela>
            {lista.length > LIMITE && <Vazio>Mostrando as {LIMITE} mais recentes de {lista.length}. Use os filtros ou os relatórios para ver todas.</Vazio>}
          </>
        ) : (
          <Vazio>Nenhuma movimentação registrada com esses filtros.</Vazio>
        )}
      </Secao>
      <p className="mt-3 text-xs text-gray-400">O estorno desfaz a movimentação e devolve a quantidade ao lote. O registro permanece no histórico, riscado.</p>
    </div>
  );
}
