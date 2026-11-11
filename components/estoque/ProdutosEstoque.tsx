'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { CabecalhoEstoque } from '@/components/estoque/Cabecalho';
import { BotaoIcone, Secao, StatusBadge, TD, TDN, TH, THN, Tabela, Vazio } from '@/components/estoque/ui';
import { IconEdit, IconMenos, IconPlus, IconSearch, IconTrash, IconValidade } from '@/components/icons';
import {
  STATUS_LABEL,
  TIPOS_PRODUTO,
  abaixoDoMinimo,
  categoriasDe,
  estoqueAtual,
  estoqueDisponivel,
  estoqueVencido,
  fmtConteudo,
  fmtQtd,
  ordenarPorNome,
  reposicao,
  statusProduto,
  type StatusProduto,
} from '@/lib/estoque/calc';
import type { EstoqueProduto, TipoProdutoEstoque } from '@/types/database';

export function TabelaProdutos({ produtos }: { produtos: EstoqueProduto[] }) {
  const { dados, abrir, confirmar, gravar, avisar } = useEstoque();

  async function excluir(p: EstoqueProduto) {
    const nl = dados.lotes.filter((l) => l.produto_id === p.id).length;
    const nm = dados.movs.filter((m) => m.produto_id === p.id).length;
    const ok = await confirmar({
      titulo: 'Excluir produto',
      perigo: true,
      ok: 'Excluir',
      mensagem: (
        <>
          Excluir <b>{p.nome}</b>?
          {(nl > 0 || nm > 0) && (
            <p className="mt-2">
              Isso também apagará <b>{nl} lote(s)</b> e <b>{nm} movimentação(ões)</b> deste produto. Esta ação não pode ser desfeita.
            </p>
          )}
        </>
      ),
    });
    if (!ok) return;
    try {
      await gravar('estoque_produtos', 'delete', undefined, { coluna: 'id', valor: p.id });
      avisar('Produto excluído.');
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }

  if (!produtos.length) return <Vazio>Nenhum produto encontrado.</Vazio>;
  return (
    <Tabela minW={1050}>
      <thead>
        <tr>
          <th className={TH}>Produto</th>
          <th className={TH}>Categoria</th>
          <th className={THN}>Meta</th>
          <th className={THN}>Atual</th>
          <th className={THN}>Disponível</th>
          <th className={TH}>Un.</th>
          <th className={THN}>Mín. seg.</th>
          <th className={THN}>Repor</th>
          <th className={TH}>Local</th>
          <th className={TH}>Status</th>
          <th className={TH} />
        </tr>
      </thead>
      <tbody>
        {produtos.map((p) => {
          const a = estoqueAtual(dados, p);
          const venc = estoqueVencido(dados, p);
          const rep = reposicao(dados, p);
          return (
            <tr key={p.id} className="hover:bg-gray-50/60">
              <td className={TD}>
                <p className="font-semibold text-gray-900">{p.nome}</p>
                <p className="text-xs text-gray-400">
                  {TIPOS_PRODUTO[p.tipo]}
                  {p.emb_conteudo && p.emb_unidade ? ` · emb. ${fmtConteudo(p.emb_conteudo, p.emb_unidade)}` : ''}
                  {p.obs ? ` · ${p.obs.length > 50 ? `${p.obs.slice(0, 50)}…` : p.obs}` : ''}
                </p>
              </td>
              <td className={TD}>{p.categoria}</td>
              <td className={TDN}>{p.meta > 0 ? fmtQtd(p.meta) : '—'}</td>
              <td className={TDN}>
                <b className={a < 0 ? 'text-negative' : ''}>{fmtQtd(a)}</b>
              </td>
              <td className={TDN}>
                {fmtQtd(estoqueDisponivel(dados, p))}
                {venc > 0 && <p className="text-xs text-negative">{fmtQtd(venc)} vencido</p>}
              </td>
              <td className={TD}>{p.unidade}</td>
              <td className={TDN}>
                {p.minimo > 0 ? fmtQtd(p.minimo) : '—'}
                {abaixoDoMinimo(dados, p) && <p className="text-xs text-amber-600">abaixo</p>}
              </td>
              <td className={TDN}>{rep > 0 ? <b>{fmtQtd(rep)}</b> : '0'}</td>
              <td className={TD}>{dados.locais.find((l) => l.id === p.local_id)?.nome ?? '—'}</td>
              <td className={TD}>
                <StatusBadge status={statusProduto(dados, p)} />
              </td>
              <td className={TD}>
                <div className="flex justify-end gap-0.5 whitespace-nowrap">
                  <BotaoIcone titulo="Entrada" onClick={() => abrir({ tipo: 'entrada', produtoId: p.id })}>
                    <IconPlus className="h-4 w-4" />
                  </BotaoIcone>
                  <BotaoIcone titulo="Saída" onClick={() => abrir({ tipo: 'saida', produtoId: p.id })}>
                    <IconMenos className="h-4 w-4" />
                  </BotaoIcone>
                  <Link href={`/estoque/lotes?produto=${p.id}`} title="Ver lotes" aria-label="Ver lotes" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                    <IconValidade className="h-4 w-4" />
                  </Link>
                  <BotaoIcone titulo="Editar" onClick={() => abrir({ tipo: 'produto', id: p.id })}>
                    <IconEdit className="h-4 w-4" />
                  </BotaoIcone>
                  <BotaoIcone titulo="Excluir" perigo onClick={() => excluir(p)}>
                    <IconTrash className="h-4 w-4" />
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

export function ProdutosEstoque() {
  const { dados, abrir } = useEstoque();
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState('');
  const [st, setSt] = useState<'' | StatusProduto | 'min'>('');
  const [tipo, setTipo] = useState<'' | TipoProdutoEstoque>('');
  const q = busca.toLowerCase();
  const lista = dados.produtos
    .filter(
      (p) =>
        (!q || `${p.nome} ${p.categoria} ${p.obs ?? ''}`.toLowerCase().includes(q)) &&
        (!cat || p.categoria === cat) &&
        (!st || (st === 'min' ? abaixoDoMinimo(dados, p) : statusProduto(dados, p) === st)) &&
        (!tipo || p.tipo === tipo)
    )
    .sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR') || ordenarPorNome(a, b));

  return (
    <div>
      <CabecalhoEstoque titulo="Controle de estoque" descricao="Produtos, metas, quantidades e status">
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'produto' })}>
          <IconPlus className="h-4 w-4" /> Novo produto
        </button>
      </CabecalhoEstoque>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className="input-field !pl-9" placeholder="Buscar produto…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="input-field !w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categoriasDe(dados).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="input-field !w-auto" value={st} onChange={(e) => setSt(e.target.value as typeof st)}>
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as StatusProduto[]).map((k) => (
            <option key={k} value={k}>
              {STATUS_LABEL[k]}
            </option>
          ))}
          <option value="min">Abaixo do mínimo de segurança</option>
        </select>
        <select className="input-field !w-auto" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
          <option value="">Todos os tipos</option>
          {(Object.keys(TIPOS_PRODUTO) as TipoProdutoEstoque[]).map((k) => (
            <option key={k} value={k}>
              {TIPOS_PRODUTO[k]}
            </option>
          ))}
        </select>
      </div>
      <Secao semPadding>
        <TabelaProdutos produtos={lista} />
      </Secao>
      <p className="mt-3 text-xs text-gray-400">
        <b>Atual</b> = soma de todos os lotes · <b>Disponível</b> = apenas lotes dentro da validade · <b>Repor</b> = meta − estoque atual.
      </p>
    </div>
  );
}
