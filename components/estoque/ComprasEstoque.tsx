'use client';

import { useState } from 'react';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { CabecalhoEstoque } from '@/components/estoque/Cabecalho';
import { Aviso, Badge, BotaoIcone, Kpi, Secao, StatusBadge, TD, TDN, TH, THN, Tabela, Vazio } from '@/components/estoque/ui';
import { IconImprimir, IconPlanilha, IconPlus, IconTrash } from '@/components/icons';
import { estoqueAtual, fmtQtd, ordenarPorNome, percentualMeta, statusProduto, type Relatorio } from '@/lib/estoque/calc';
import { baixarArquivo, imprimirHtml, nomeArquivo, relatorioXlsx, tabelaHtml } from '@/lib/estoque/exportar';
import type { EstoqueListaItem, EstoqueProduto } from '@/types/database';

const STATUS_TEXTO = { green: 'Completo', amber: 'Abaixo da meta', red: 'Sem estoque', sm: 'Meta não definida' } as const;

/** Observação editável direto na tabela: salva ao sair do campo ou com Enter. */
function CampoObs({ item }: { item: EstoqueListaItem }) {
  const { gravar, avisar } = useEstoque();
  const [texto, setTexto] = useState(item.obs ?? '');
  const [salvando, setSalvando] = useState(false);
  async function salvar() {
    const novo = texto.trim();
    if (novo === (item.obs ?? '')) return;
    setSalvando(true);
    try {
      await gravar('estoque_lista', 'update', { obs: novo || null }, { coluna: 'id', valor: item.id });
    } catch (e) {
      avisar((e as Error).message, true);
      setTexto(item.obs ?? '');
    } finally {
      setSalvando(false);
    }
  }
  return (
    <input
      className={`input-field !py-1.5 text-sm ${salvando ? 'opacity-60' : ''}`}
      value={texto}
      maxLength={200}
      placeholder="Adicionar observação…"
      aria-label="Observação"
      onChange={(e) => setTexto(e.target.value)}
      onBlur={salvar}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

export function ComprasEstoque() {
  const { dados, abrir, gravar, confirmar, avisar } = useEstoque();
  const [adicionando, setAdicionando] = useState(false);

  if (dados.lista === null) {
    return (
      <div>
        <CabecalhoEstoque titulo="Lista de compras" />
        <Aviso tom="amarelo">
          A lista de compras precisa de uma atualização no banco. No Supabase → <b>SQL Editor</b>, rode o arquivo <b>supabase/migrations/0021_estoque_lista_compras.sql</b> e
          recarregue a página.
        </Aviso>
      </div>
    );
  }

  const lista = dados.lista;
  const produtoDe = (i: EstoqueListaItem) => (i.produto_id ? dados.produtos.find((p) => p.id === i.produto_id) : undefined);
  const nomeDe = (i: EstoqueListaItem) => produtoDe(i)?.nome ?? i.nome ?? '—';
  // ordem: sem estoque, abaixo da meta, demais produtos, itens livres
  const peso = (i: EstoqueListaItem) => {
    const p = produtoDe(i);
    if (!p) return 4;
    return { red: 0, amber: 1, sm: 2, green: 3 }[statusProduto(dados, p)];
  };
  const itens = [...lista].sort((a, b) => peso(a) - peso(b) || nomeDe(a).localeCompare(nomeDe(b), 'pt-BR'));

  const naLista = new Set(lista.map((i) => i.produto_id).filter(Boolean));
  const sugestoes = dados.produtos
    .filter((p) => p.meta > 0 && !naLista.has(p.id) && ['red', 'amber'].includes(statusProduto(dados, p)))
    .sort((a, b) => percentualMeta(dados, a) - percentualMeta(dados, b) || ordenarPorNome(a, b));

  const contaStatus = (s: 'red' | 'amber') => itens.filter((i) => produtoDe(i) && statusProduto(dados, produtoDe(i)!) === s).length;

  async function adicionar(ps: EstoqueProduto[]) {
    if (!ps.length) return;
    setAdicionando(true);
    try {
      await gravar('estoque_lista', 'insert', ps.map((p) => ({ produto_id: p.id })));
      avisar(ps.length === 1 ? `${ps[0].nome} incluído na lista.` : `${ps.length} itens incluídos na lista.`);
    } catch (e) {
      avisar((e as Error).message, true);
    } finally {
      setAdicionando(false);
    }
  }

  /** Item livre → produto do estoque (se já existir um produto com o mesmo nome, só liga os dois). */
  async function cadastrar(i: EstoqueListaItem) {
    const nome = (i.nome ?? '').trim().toLowerCase();
    const existente = dados.produtos.find((p) => p.nome.trim().toLowerCase() === nome);
    if (!existente) return abrir({ tipo: 'produto', nome: i.nome ?? '', listaId: i.id });
    if (dados.lista?.some((x) => x.produto_id === existente.id)) {
      avisar(`${existente.nome} já está na lista como produto do estoque. Retire este item duplicado.`, true);
      return;
    }
    try {
      await gravar('estoque_lista', 'update', { produto_id: existente.id, nome: null }, { coluna: 'id', valor: i.id });
      abrir({ tipo: 'produto', id: existente.id });
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }

  async function excluir(i: EstoqueListaItem) {
    try {
      await gravar('estoque_lista', 'delete', undefined, { coluna: 'id', valor: i.id });
      avisar(`${nomeDe(i)} retirado da lista.`);
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }

  async function limpar() {
    const ok = await confirmar({ titulo: 'Limpar lista', perigo: true, ok: 'Limpar tudo', mensagem: `Retirar os ${lista.length} itens da lista de compras?` });
    if (!ok) return;
    try {
      for (const i of lista) await gravar('estoque_lista', 'delete', undefined, { coluna: 'id', valor: i.id });
      avisar('Lista limpa.');
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }

  function relatorio(): Relatorio {
    return {
      colunas: [
        { titulo: 'Item', chave: 'item' },
        { titulo: 'Categoria', chave: 'cat' },
        { titulo: 'Meta', chave: 'meta', tipo: 'num' },
        { titulo: 'Atual', chave: 'atual', tipo: 'num' },
        { titulo: 'Un.', chave: 'un' },
        { titulo: 'Status', chave: 'status' },
        { titulo: 'Observação', chave: 'obs' },
      ],
      linhas: itens.map((i) => {
        const p = produtoDe(i);
        return {
          item: nomeDe(i),
          cat: p?.categoria ?? '',
          meta: p && p.meta > 0 ? p.meta : null,
          atual: p ? estoqueAtual(dados, p) : null,
          un: p?.unidade ?? '',
          status: p ? STATUS_TEXTO[statusProduto(dados, p)] : '',
          obs: i.obs ?? '',
        };
      }),
    };
  }

  return (
    <div>
      <CabecalhoEstoque titulo="Lista de compras" descricao="Monte a lista do que precisa comprar. Meta, estoque atual e status vêm do cadastro dos produtos.">
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'itemLista' })}>
          <IconPlus className="h-4 w-4" /> Incluir item
        </button>
      </CabecalhoEstoque>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Kpi titulo="Itens na lista" valor={lista.length} tom="azul" />
        <Kpi titulo="Sem estoque" valor={contaStatus('red')} tom="vermelho" sub="na lista" />
        <Kpi titulo="Abaixo da meta" valor={contaStatus('amber')} tom="amarelo" sub="na lista" />
      </div>

      {sugestoes.length > 0 && (
        <Secao
          className="mb-4"
          titulo={`Sugestões: ${sugestoes.length} produto(s) abaixo da meta fora da lista`}
          extra={
            <button type="button" className="btn-secondary !px-3 !py-1 text-xs" disabled={adicionando} onClick={() => adicionar(sugestoes)}>
              <IconPlus className="h-3.5 w-3.5" /> Incluir todos
            </button>
          }
        >
          <div className="flex flex-wrap gap-2">
            {sugestoes.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={adicionando}
                onClick={() => adicionar([p])}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
              >
                <IconPlus className="h-3.5 w-3.5" />
                {p.nome}
                <span className={`h-1.5 w-1.5 rounded-full ${statusProduto(dados, p) === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
              </button>
            ))}
          </div>
        </Secao>
      )}

      <Secao
        titulo="Itens da lista"
        semPadding
        extra={
          lista.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => baixarArquivo(`${nomeArquivo('lista-de-compras')}.xlsx`, relatorioXlsx('Lista de compras', relatorio()))}>
                <IconPlanilha className="h-3.5 w-3.5" /> Excel
              </button>
              <button type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => imprimirHtml('Lista de compras', ` · ${lista.length} item(ns)`, tabelaHtml(relatorio()))}>
                <IconImprimir className="h-3.5 w-3.5" /> Imprimir / PDF
              </button>
              <button type="button" className="btn-secondary !px-3 !py-1 text-xs text-negative" onClick={limpar}>
                Limpar lista
              </button>
            </div>
          )
        }
      >
        {itens.length ? (
          <Tabela minW={820}>
            <thead>
              <tr>
                <th className={TH}>Item</th>
                <th className={THN}>Meta</th>
                <th className={THN}>Atual</th>
                <th className={TH}>Status</th>
                <th className={`${TH} w-[34%]`}>Observação</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => {
                const p = produtoDe(i);
                const atual = p ? estoqueAtual(dados, p) : null;
                return (
                  <tr key={i.id} className="hover:bg-gray-50/60">
                    <td className={TD}>
                      <p className="font-semibold text-gray-900">{nomeDe(i)}</p>
                      {p ? (
                        <p className="text-xs text-gray-400">{p.categoria}</p>
                      ) : (
                        <p className="text-xs text-gray-400">
                          Item fora do estoque ·{' '}
                          <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => cadastrar(i)}>
                            cadastrar no estoque
                          </button>
                        </p>
                      )}
                    </td>
                    <td className={TDN}>
                      {p ? (
                        p.meta > 0 ? (
                          `${fmtQtd(p.meta)} ${p.unidade}`
                        ) : (
                          <button type="button" className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => abrir({ tipo: 'produto', id: p.id })}>
                            definir meta
                          </button>
                        )
                      ) : (
                        <button type="button" className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => cadastrar(i)}>
                          definir meta
                        </button>
                      )}
                    </td>
                    <td className={TDN}>{p ? <b className={atual! < 0 ? 'text-negative' : ''}>{`${fmtQtd(atual!)} ${p.unidade}`}</b> : '—'}</td>
                    <td className={TD}>{p ? <StatusBadge status={statusProduto(dados, p)} /> : <Badge tom="cinza" ponto={false}>Sem controle</Badge>}</td>
                    <td className={TD}>
                      <CampoObs key={`${i.id}-${i.obs ?? ''}`} item={i} />
                    </td>
                    <td className={TD}>
                      <BotaoIcone titulo="Retirar da lista" perigo onClick={() => excluir(i)}>
                        <IconTrash className="h-4 w-4" />
                      </BotaoIcone>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tabela>
        ) : (
          <Vazio>
            A lista está vazia. Use <b>Incluir item</b>
            {sugestoes.length > 0 ? ' ou as sugestões acima' : ''}.
          </Vazio>
        )}
      </Secao>
      <p className="mt-3 text-xs text-gray-400">A observação é salva automaticamente quando você sai do campo. Retirar um item da lista não mexe no estoque.</p>
    </div>
  );
}
