'use client';

import { useState } from 'react';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { CabecalhoEstoque } from '@/components/estoque/Cabecalho';
import { Kpi, Secao, StatusBadge, TD, TDN, TH, THN, Tabela, Vazio } from '@/components/estoque/ui';
import { IconBaixar, IconCheck, IconImprimir, IconPlanilha } from '@/components/icons';
import { estoqueAtual, fmtQtd, gerarRelatorio, itensParaComprar, paraInput, parseNumero, statusProduto } from '@/lib/estoque/calc';
import { baixarArquivo, imprimirHtml, nomeArquivo, relatorioXlsx } from '@/lib/estoque/exportar';

type Sel = Record<string, { marcado: boolean; qtd: string }>;

export function ComprasEstoque() {
  const { dados, abrir, avisar } = useEstoque();
  const itens = itensParaComprar(dados);
  const [sel, setSel] = useState<Sel>({});
  const estado = (pid: string, padrao: number) => sel[pid] ?? { marcado: false, qtd: paraInput(padrao) };
  const qtdDe = (pid: string, padrao: number) => {
    const v = parseNumero(estado(pid, padrao).qtd);
    return Number.isNaN(v) || v < 0 ? 0 : v;
  };
  const mudar = (pid: string, padrao: number, campo: 'marcado' | 'qtd', v: boolean | string) =>
    setSel((s) => ({ ...s, [pid]: { ...estado(pid, padrao), [campo]: v } }));

  const marcados = itens.filter((i) => estado(i.produto.id, i.comprar).marcado);
  const zerados = itens.filter((i) => statusProduto(dados, i.produto) === 'red').length;

  function marcarTodos() {
    const todos = itens.every((i) => estado(i.produto.id, i.comprar).marcado);
    setSel(Object.fromEntries(itens.map((i) => [i.produto.id, { ...estado(i.produto.id, i.comprar), marcado: !todos }])));
  }
  function darEntrada() {
    const lista = marcados.map((i) => ({ produtoId: i.produto.id, qtd: qtdDe(i.produto.id, i.comprar) })).filter((i) => i.qtd > 0);
    if (!lista.length) return avisar('Marque ao menos um item com quantidade maior que zero.', true);
    abrir({ tipo: 'entradaCompras', itens: lista });
    setSel({});
  }
  function imprimir() {
    const linhas = itens
      .map((i) => {
        const q = qtdDe(i.produto.id, i.comprar);
        return `<tr><td>☐</td><td>${i.produto.nome}</td><td>${i.produto.categoria}</td><td class="n">${fmtQtd(i.produto.meta)}</td><td class="n">${fmtQtd(estoqueAtual(dados, i.produto))}</td><td class="n"><b>${fmtQtd(q)} ${i.produto.unidade}</b></td></tr>`;
      })
      .join('');
    imprimirHtml(
      'Lista de compras',
      ` · ${itens.length} produto(s)`,
      `<table><thead><tr><th>✓</th><th>Produto</th><th>Categoria</th><th class="n">Meta</th><th class="n">Atual</th><th class="n">Comprar</th></tr></thead><tbody>${linhas}</tbody></table>`
    );
  }

  return (
    <div>
      <CabecalhoEstoque titulo="Lista de compras" descricao="Gerada automaticamente com os produtos abaixo da meta, dos mais críticos aos menos" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi titulo="Produtos para comprar" valor={itens.length} tom="azul" sub="abaixo da meta" />
        <Kpi titulo="Sem estoque" valor={zerados} tom="vermelho" sub="prioridade" />
        <Kpi titulo="Itens marcados" valor={marcados.length} tom="verde" sub="para dar entrada" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={marcarTodos}>
          <IconCheck className="h-4 w-4" /> Marcar todos
        </button>
        <div className="flex-1" />
        <button type="button" className="btn-secondary" onClick={() => baixarArquivo(`${nomeArquivo('lista-de-compras')}.xlsx`, relatorioXlsx('Lista de compras', gerarRelatorio(dados, 'reposicao')))}>
          <IconPlanilha className="h-4 w-4" /> Excel
        </button>
        <button type="button" className="btn-secondary" onClick={imprimir}>
          <IconImprimir className="h-4 w-4" /> Imprimir / PDF
        </button>
        <button type="button" className="btn-primary" onClick={darEntrada}>
          <IconBaixar className="h-4 w-4" /> Dar entrada nos marcados
        </button>
      </div>
      <Secao semPadding>
        {itens.length ? (
          <Tabela minW={700}>
            <thead>
              <tr>
                <th className={`${TH} w-10`} />
                <th className={TH}>Produto</th>
                <th className={THN}>Meta</th>
                <th className={THN}>Atual</th>
                <th className={THN}>Comprar</th>
                <th className={TH}>Un.</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => {
                const p = i.produto;
                const e = estado(p.id, i.comprar);
                const q = qtdDe(p.id, i.comprar);
                return (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className={`${TD} text-center`}>
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-500" checked={e.marcado} onChange={(ev) => mudar(p.id, i.comprar, 'marcado', ev.target.checked)} aria-label={`Marcar ${p.nome}`} />
                    </td>
                    <td className={TD}>
                      <p className="font-semibold text-gray-900">{p.nome}</p>
                      <p className="text-xs text-gray-400">
                        {p.categoria}
                        {p.tipo === 'agua' && ` · ≈ ${Math.ceil(q / (p.cap || 5))} garrafa(s) de ${fmtQtd(p.cap || 5)} L`}
                      </p>
                    </td>
                    <td className={TDN}>{fmtQtd(p.meta)}</td>
                    <td className={TDN}>{fmtQtd(estoqueAtual(dados, p))}</td>
                    <td className={TDN}>
                      <input className="input-field !w-24 !py-1 text-right" inputMode="decimal" value={e.qtd} onChange={(ev) => mudar(p.id, i.comprar, 'qtd', ev.target.value)} aria-label={`Quantidade de ${p.nome}`} />
                    </td>
                    <td className={TD}>{p.unidade}</td>
                    <td className={TD}>
                      <StatusBadge status={statusProduto(dados, p)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tabela>
        ) : (
          <Vazio>Tudo certo! Todos os produtos estão na meta.</Vazio>
        )}
      </Secao>
      <p className="mt-3 text-xs text-gray-400">Ajuste a quantidade se quiser comprar mais ou menos que o necessário para a meta, marque o que comprou e dê entrada.</p>
    </div>
  );
}
