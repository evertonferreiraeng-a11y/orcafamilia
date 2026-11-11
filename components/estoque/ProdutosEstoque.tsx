'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { CabecalhoEstoque } from '@/components/estoque/Cabecalho';
import { baixarArquivo, nomeArquivo, relatorioXlsx } from '@/lib/estoque/exportar';
import { Barra, BotaoIcone, Secao, StatusBadge, TD, TH, Tabela, Vazio } from '@/components/estoque/ui';
import { IconPlanilha, IconEdit, IconMenos, IconPlus, IconSearch, IconTrash, IconValidade } from '@/components/icons';
import {
  RELATORIOS,
  gerarRelatorio,
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
import { emojiCategoria } from '@/lib/estoque/visual';
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

/* ---------- visão em cartões ---------- */
export function CartoesProdutos({ produtos }: { produtos: EstoqueProduto[] }) {
  const { dados, abrir } = useEstoque();
  if (!produtos.length) return <Vazio>Nenhum produto encontrado.</Vazio>;
  const grupos: Record<string, EstoqueProduto[]> = {};
  for (const p of produtos) (grupos[p.categoria] = grupos[p.categoria] || []).push(p);
  const COR: Record<StatusProduto, string> = { green: 'before:bg-emerald-500', amber: 'before:bg-amber-500', red: 'before:bg-red-500', sm: 'before:bg-gray-300' };
  return (
    <div className="space-y-6">
      {Object.entries(grupos).map(([cat, lista]) => (
        <section key={cat}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <span aria-hidden>{emojiCategoria(cat)}</span> {cat}
            <span className="rounded-full bg-gray-100 px-2 text-xs font-medium text-gray-500">{lista.length}</span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {lista.map((p) => {
              const a = estoqueAtual(dados, p);
              const falta = reposicao(dados, p);
              const st = statusProduto(dados, p);
              const pct = percentualMeta(dados, p) * 100;
              const venc = estoqueVencido(dados, p);
              return (
                <article
                  key={p.id}
                  className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-soft transition before:absolute before:inset-y-0 before:left-0 before:w-1 hover:-translate-y-0.5 hover:shadow-card ${COR[st]}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-semibold text-gray-900" title={p.nome}>
                        {p.nome}
                      </h4>
                      <p className="truncate text-xs text-gray-400">
                        {dados.locais.find((l) => l.id === p.local_id)?.nome ?? 'Sem local'}
                        {p.emb_conteudo && p.emb_unidade ? ` · emb. ${fmtConteudo(p.emb_conteudo, p.emb_unidade)}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={st} />
                  </div>
                  <p className="mt-3 tabular-nums">
                    <span className={`text-2xl font-bold ${a < 0 ? 'text-negative' : 'text-gray-900'}`}>{fmtQtd(a)}</span>
                    <span className="text-sm text-gray-500">
                      {p.meta > 0 ? ` / ${fmtQtd(p.meta)}` : ''} {p.unidade}
                    </span>
                  </p>
                  {p.meta > 0 && (
                    <div className="my-1.5">
                      <Barra pct={pct} tom={st === 'green' ? 'verde' : st === 'red' ? 'vermelho' : 'amarelo'} />
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {p.meta > 0 ? (falta > 0 ? `Faltam ${fmtQtd(falta)} ${p.unidade}` : <span className="font-medium text-emerald-600">Meta atingida ✓</span>) : 'Sem meta definida'}
                    {venc > 0 && <span className="ml-1 font-medium text-negative">· {fmtQtd(venc)} vencido(s)</span>}
                    {abaixoDoMinimo(dados, p) && <span className="ml-1 font-medium text-amber-700">· abaixo do mínimo</span>}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 border-t border-gray-50 pt-3">
                    <button type="button" className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-50 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100" onClick={() => abrir({ tipo: 'entrada', produtoId: p.id })}>
                      <IconPlus className="h-3.5 w-3.5" /> Entrada
                    </button>
                    <button type="button" className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-50 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100" onClick={() => abrir({ tipo: 'saida', produtoId: p.id })}>
                      <IconMenos className="h-3.5 w-3.5" /> Saída
                    </button>
                    <Link href={`/estoque/lotes?produto=${p.id}`} title="Lotes e validades" aria-label="Lotes e validades" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                      <IconValidade className="h-4 w-4" />
                    </Link>
                    <BotaoIcone titulo="Editar produto" onClick={() => abrir({ tipo: 'produto', id: p.id })}>
                      <IconEdit className="h-4 w-4" />
                    </BotaoIcone>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ProdutosEstoque() {
  const { dados, abrir } = useEstoque();
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState('');
  const params = useSearchParams();
  const [st, setSt] = useState<'' | StatusProduto | 'min'>((params.get('status') as StatusProduto | 'min' | null) ?? '');
  const [visao, setVisao] = useState<'cartoes' | 'lista'>('cartoes');
  // lembra a visão escolhida neste aparelho
  useEffect(() => {
    try {
      const v = localStorage.getItem('life-estoque-visao');
      if (v === 'lista' || v === 'cartoes') setVisao(v);
    } catch {}
  }, []);
  function trocarVisao(v: 'cartoes' | 'lista') {
    setVisao(v);
    try {
      localStorage.setItem('life-estoque-visao', v);
    } catch {}
  }
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
        <button
          type="button"
          className="btn-secondary"
          title="Baixar planilha com todos os produtos, tipo, categoria, meta e quantidade"
          onClick={() => {
            const titulo = RELATORIOS.produtos;
            baixarArquivo(`${nomeArquivo('Produtos do estoque')}.xlsx`, relatorioXlsx(titulo, gerarRelatorio(dados, 'produtos')));
          }}
        >
          <IconPlanilha className="h-4 w-4" /> Exportar Excel
        </button>
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
        <div className="ml-auto flex rounded-xl bg-gray-100 p-1 text-xs font-semibold" role="group" aria-label="Forma de exibição">
          {(['cartoes', 'lista'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => trocarVisao(v)}
              aria-pressed={visao === v}
              className={`rounded-lg px-3 py-1.5 transition ${visao === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {v === 'cartoes' ? 'Cartões' : 'Lista'}
            </button>
          ))}
        </div>
      </div>
      {visao === 'cartoes' ? (
        <CartoesProdutos produtos={lista} />
      ) : (
        <Secao semPadding>
          <TabelaProdutos produtos={lista} />
        </Secao>
      )}
      <p className="mt-3 text-xs text-gray-400">
        O <b>mínimo de segurança</b> e a meta são definidos em <b>Editar produto</b> (lápis). Quando houver lotes vencidos, eles aparecem em vermelho embaixo do estoque.
      </p>
    </div>
  );
}
