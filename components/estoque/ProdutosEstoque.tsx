'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { CabecalhoEstoque } from '@/components/estoque/Cabecalho';
import { Barra, BotaoIcone, Secao, StatusBadge, TD, TH, Tabela, Vazio } from '@/components/estoque/ui';
import { IconEdit, IconMenos, IconPlus, IconSearch, IconTrash, IconValidade } from '@/components/icons';
import {
  STATUS_LABEL,
  TIPOS_PRODUTO,
  abaixoDoMinimo,
  categoriasDe,
  estoqueAtual,
  estoqueVencido,
  fmtConteudo,
  fmtQtd,
  ordenarPorNome,
  percentualMeta,
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
    <Tabela minW={900}>
      <thead>
        <tr>
          <th className={TH}>Produto</th>
          <th className={`${TH} w-[34%]`}>Estoque</th>
          <th className={TH}>Local</th>
          <th className={TH}>Status</th>
          <th className={TH} />
        </tr>
      </thead>
      <tbody>
        {produtos.map((p) => {
          const a = estoqueAtual(dados, p);
          const venc = estoqueVencido(dados, p);
          const falta = reposicao(dados, p);
          const st = statusProduto(dados, p);
          const pct = percentualMeta(dados, p) * 100;
          return (
            <tr key={p.id} className="hover:bg-gray-50/60">
              <td className={TD}>
                <p className="font-semibold text-gray-900">{p.nome}</p>
                <p className="text-xs text-gray-400">
                  {p.categoria}
                  {p.tipo === 'bebe' && p.categoria !== 'Bebê' ? ' · controle do bebê' : p.tipo === 'agua' && p.categoria !== 'Água' ? ' · água potável' : ''}
                  {p.emb_conteudo && p.emb_unidade ? ` · emb. ${fmtConteudo(p.emb_conteudo, p.emb_unidade)}` : ''}
                </p>
              </td>
              <td className={TD}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="tabular-nums">
                    <b className={`text-base ${a < 0 ? 'text-negative' : 'text-gray-900'}`}>{fmtQtd(a)}</b>
                    <span className="text-gray-500">
                      {p.meta > 0 ? ` de ${fmtQtd(p.meta)}` : ''} {p.unidade}
                    </span>
                  </span>
                  {p.meta > 0 && <span className="text-xs font-semibold tabular-nums text-gray-500">{Math.round(pct)}%</span>}
                </div>
                {p.meta > 0 && (
                  <div className="my-1">
                    <Barra pct={pct} tom={st === 'green' ? 'verde' : st === 'red' ? 'vermelho' : 'amarelo'} />
                  </div>
                )}
                <p className="text-xs">
                  {p.meta > 0 ? (
                    falta > 0 ? (
                      <span className="text-gray-500">
                        Faltam <b className="text-gray-700">{fmtQtd(falta)} {p.unidade}</b>
                      </span>
                    ) : (
                      <span className="font-medium text-emerald-600">Meta atingida</span>
                    )
                  ) : (
                    <span className="text-gray-400">Sem meta definida</span>
                  )}
                  {venc > 0 && <span className="ml-2 font-medium text-negative">· {fmtQtd(venc)} {p.unidade} vencido(s)</span>}
                </p>
              </td>
              <td className={TD}>{dados.locais.find((l) => l.id === p.local_id)?.nome ?? '—'}</td>
              <td className={TD}>
                <StatusBadge status={st} />
                {abaixoDoMinimo(dados, p) && (
                  <p className="mt-1 text-[11px] font-medium text-amber-700" title="Quantidade mínima de segurança definida no produto">
                    Abaixo do mínimo ({fmtQtd(p.minimo)} {p.unidade})
                  </p>
                )}
              </td>
              <td className={TD}>
                <div className="flex justify-end gap-0.5 whitespace-nowrap">
                  <BotaoIcone titulo="Entrada" onClick={() => abrir({ tipo: 'entrada', produtoId: p.id })}>
                    <IconPlus className="h-4 w-4" />
                  </BotaoIcone>
                  <BotaoIcone titulo="Saída" onClick={() => abrir({ tipo: 'saida', produtoId: p.id })}>
                    <IconMenos className="h-4 w-4" />
                  </BotaoIcone>
                  <Link href={`/estoque/lotes?produto=${p.id}`} title="Ver lotes e validades" aria-label="Ver lotes e validades" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                    <IconValidade className="h-4 w-4" />
                  </Link>
                  <BotaoIcone titulo="Editar produto" onClick={() => abrir({ tipo: 'produto', id: p.id })}>
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
        O <b>mínimo de segurança</b> e a meta são definidos em <b>Editar produto</b> (lápis). Quando houver lotes vencidos, eles aparecem em vermelho embaixo do estoque.
      </p>
    </div>
  );
}
