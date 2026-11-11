'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { Campo } from '@/components/estoque/ui';
import {
  CAPACIDADES,
  CONDICOES,
  SAIDAS,
  TIPOS_MOV,
  TIPOS_PRODUTO,
  UNIDADES,
  categoriasDe,
  diasAte,
  estoqueAtual,
  estoqueDisponivel,
  estoqueVencido,
  fmtData,
  fmtPct,
  fmtQtd,
  fornecedoresDe,
  hojeISO,
  loteVencido,
  lotesDoProduto,
  ordemFEFO,
  ordenarPorNome,
  paraInput,
  parseNumero,
  planoSaida,
  r2,
  r3,
  type DadosEstoque,
} from '@/lib/estoque/calc';
import type { EstoqueProduto, TipoProdutoEstoque, TipoSaidaEstoque } from '@/types/database';

/* ---------- validação ---------- */
function lerNumero(texto: string, o: { rotulo: string; obrigatorio?: boolean; maiorQue?: number; minimo?: number }): number | null {
  if (!texto.trim()) {
    if (o.obrigatorio) throw new Error(`Informe ${o.rotulo}.`);
    return null;
  }
  const v = parseNumero(texto);
  const R = o.rotulo.charAt(0).toUpperCase() + o.rotulo.slice(1);
  if (Number.isNaN(v)) throw new Error(`${R}: valor inválido. Use números, ex.: 2,5`);
  if (o.maiorQue !== undefined && v <= o.maiorQue) throw new Error(`${R} deve ser maior que ${o.maiorQue}.`);
  if (o.minimo !== undefined && v < o.minimo) throw new Error(`${R} deve ser maior ou igual a ${o.minimo}.`);
  return v;
}

function Erro({ texto }: { texto: string }) {
  if (!texto) return null;
  return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-negative">{texto}</p>;
}

function Rodape({ onCancelar, salvando, rotulo = 'Salvar' }: { onCancelar: () => void; salvando: boolean; rotulo?: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
      <button type="button" className="btn-secondary" onClick={onCancelar}>
        Cancelar
      </button>
      <button type="submit" className="btn-primary" disabled={salvando}>
        {salvando ? 'Salvando…' : rotulo}
      </button>
    </div>
  );
}

function OpcoesProdutos({ dados, filtro }: { dados: DadosEstoque; filtro?: (p: EstoqueProduto) => boolean }) {
  const grupos = useMemo(() => {
    const g: Record<string, EstoqueProduto[]> = {};
    for (const p of dados.produtos.filter(filtro ?? (() => true))) (g[p.categoria] = g[p.categoria] || []).push(p);
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }, [dados.produtos, filtro]);
  return (
    <>
      <option value="">Selecione…</option>
      {grupos.map(([cat, ps]) => (
        <optgroup key={cat} label={cat}>
          {[...ps].sort(ordenarPorNome).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} ({p.unidade})
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

function OpcoesLocais({ dados }: { dados: DadosEstoque }) {
  return (
    <>
      <option value="">— Sem local —</option>
      {dados.locais.map((l) => (
        <option key={l.id} value={l.id}>
          {l.nome}
        </option>
      ))}
    </>
  );
}

/* ---------- ENTRADA ---------- */
function EntradaModal({ produtoIdInicial }: { produtoIdInicial?: string }) {
  const { dados, fechar, rpc, confirmar, avisar } = useEstoque();
  const inicial = produtoIdInicial ? dados.produtos.find((p) => p.id === produtoIdInicial) : undefined;
  const [produtoId, setProdutoId] = useState(produtoIdInicial ?? '');
  const [dataCompra, setDataCompra] = useState(hojeISO());
  const [qtd, setQtd] = useState('');
  const capInicial = inicial?.cap ?? 5;
  const [capSel, setCapSel] = useState(CAPACIDADES.includes(capInicial) ? String(capInicial) : 'outra');
  const [capOutra, setCapOutra] = useState(CAPACIDADES.includes(capInicial) ? '' : paraInput(capInicial));
  const [nEmb, setNEmb] = useState('');
  const [dataFab, setDataFab] = useState('');
  const [validade, setValidade] = useState('');
  const [numLote, setNumLote] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [localId, setLocalId] = useState(inicial?.local_id ?? dados.locais[0]?.id ?? '');
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const p = dados.produtos.find((x) => x.id === produtoId);
  const agua = p?.tipo === 'agua';
  const cap = capSel === 'outra' ? parseNumero(capOutra) : Number(capSel);
  const q = agua ? (cap > 0 && parseNumero(nEmb) > 0 ? r3(cap * parseNumero(nEmb)) : NaN) : parseNumero(qtd);

  function trocarProduto(id: string) {
    setProdutoId(id);
    const np = dados.produtos.find((x) => x.id === id);
    if (np?.local_id) setLocalId(np.local_id);
    if (np?.tipo === 'agua' && np.cap) {
      if (CAPACIDADES.includes(np.cap)) setCapSel(String(np.cap));
      else {
        setCapSel('outra');
        setCapOutra(paraInput(np.cap));
      }
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      if (!p) throw new Error('Selecione o produto.');
      let quantidade: number;
      let capacidade: number | null = null;
      if (agua) {
        capacidade = capSel === 'outra' ? lerNumero(capOutra, { rotulo: 'a capacidade da embalagem', obrigatorio: true, maiorQue: 0 })! : Number(capSel);
        const n = lerNumero(nEmb, { rotulo: 'o número de embalagens', obrigatorio: true, maiorQue: 0 })!;
        if (!Number.isInteger(n)) throw new Error('O número de embalagens deve ser inteiro.');
        quantidade = r3(capacidade * n);
      } else {
        quantidade = lerNumero(qtd, { rotulo: 'a quantidade', obrigatorio: true, maiorQue: 0 })!;
      }
      if (!dataCompra) throw new Error('Informe a data da compra.');
      if (dataCompra > hojeISO()) throw new Error('A data da compra não pode ser futura.');
      if (dataFab && dataFab > dataCompra) throw new Error('A fabricação não pode ser posterior à data da compra.');
      if (dataFab && validade && validade <= dataFab) throw new Error('A validade deve ser posterior à data de fabricação.');
      if (validade && validade < hojeISO()) {
        const ok = await confirmar({ titulo: 'Validade já passou', mensagem: 'A data de validade informada já passou. Deseja registrar mesmo assim?', ok: 'Registrar mesmo assim' });
        if (!ok) return;
      }
      setSalvando(true);
      await rpc('estoque_entrada', {
        p_produto: p.id,
        p_qtd: quantidade,
        p_data_compra: dataCompra,
        p_validade: validade || null,
        p_data_fab: dataFab || null,
        p_num_lote: numLote || null,
        p_valor: 0,
        p_fornecedor: fornecedor || null,
        p_local: localId || null,
        p_cap: capacidade,
        p_obs: obs || null,
        p_tipo: 'entrada',
      });
      avisar(`Entrada registrada: ${fmtQtd(quantidade)} ${p.unidade} de ${p.nome}.`);
      fechar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const atual = p ? estoqueAtual(dados, p) : 0;
  const novo = atual + (q > 0 ? q : 0);
  const forns = fornecedoresDe(dados);

  return (
    <Modal open onClose={fechar} title="Registrar entrada de produtos" wide>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Produto" obrigatorio className="sm:col-span-2">
            <select className="input-field" value={produtoId} onChange={(e) => trocarProduto(e.target.value)}>
              <OpcoesProdutos dados={dados} />
            </select>
          </Campo>
          <Campo rotulo="Data da compra" obrigatorio>
            <input type="date" className="input-field" value={dataCompra} max={hojeISO()} onChange={(e) => setDataCompra(e.target.value)} />
          </Campo>
          {agua ? (
            <>
              <Campo rotulo="Capacidade da embalagem">
                <select className="input-field" value={capSel} onChange={(e) => setCapSel(e.target.value)}>
                  {CAPACIDADES.map((c) => (
                    <option key={c} value={String(c)}>
                      {c < 1 ? `${c * 1000} ml` : `${fmtQtd(c)} litro${c > 1 ? 's' : ''}`}
                    </option>
                  ))}
                  <option value="outra">Outra…</option>
                </select>
              </Campo>
              {capSel === 'outra' && (
                <Campo rotulo="Capacidade (litros)" obrigatorio>
                  <input className="input-field" inputMode="decimal" value={capOutra} onChange={(e) => setCapOutra(e.target.value)} placeholder="ex.: 0,35" />
                </Campo>
              )}
              <Campo rotulo="Nº de garrafas / embalagens" obrigatorio dica={q > 0 ? `Total: ${fmtQtd(q)} litros` : undefined}>
                <input className="input-field" inputMode="numeric" value={nEmb} onChange={(e) => setNEmb(e.target.value)} placeholder="ex.: 6" />
              </Campo>
            </>
          ) : (
            <Campo rotulo={`Quantidade comprada${p ? ` (${p.unidade})` : ''}`} obrigatorio>
              <input className="input-field" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="ex.: 5 ou 2,5" />
            </Campo>
          )}
          <Campo rotulo="Data de fabricação">
            <input type="date" className="input-field" value={dataFab} onChange={(e) => setDataFab(e.target.value)} />
          </Campo>
          <Campo rotulo="Data de validade" dica="Essencial para o controle FEFO">
            <input type="date" className="input-field" value={validade} onChange={(e) => setValidade(e.target.value)} />
          </Campo>
          <Campo rotulo="Número do lote">
            <input className="input-field" value={numLote} maxLength={40} onChange={(e) => setNumLote(e.target.value)} />
          </Campo>
          <Campo rotulo="Fornecedor">
            <input className="input-field" list="estoque-fornecedores" value={fornecedor} maxLength={60} onChange={(e) => setFornecedor(e.target.value)} />
            <datalist id="estoque-fornecedores">
              {forns.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Local de armazenamento">
            <select className="input-field" value={localId} onChange={(e) => setLocalId(e.target.value)}>
              <OpcoesLocais dados={dados} />
            </select>
          </Campo>
          <Campo rotulo="Observações" className="sm:col-span-2">
            <textarea className="input-field min-h-[60px]" value={obs} maxLength={300} onChange={(e) => setObs(e.target.value)} />
          </Campo>
        </div>
        {p && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
            Estoque atual: <b>{fmtQtd(atual)} {p.unidade}</b> → após a entrada: <b>{fmtQtd(novo)} {p.unidade}</b>
            {p.meta > 0 && ` (meta ${fmtQtd(p.meta)} · ${fmtPct(Math.min(novo / p.meta, 1) * 100)})`}
            <br />
            {validade ? (
              (diasAte(validade) ?? 0) < 0 ? (
                <b className="text-negative">Atenção: a data de validade já passou.</b>
              ) : (
                `Vence em ${diasAte(validade)} dias.`
              )
            ) : (
              <span className="text-gray-400">Sem validade: o lote ficará por último na ordem FEFO.</span>
            )}
          </div>
        )}
        <Erro texto={erro} />
        <Rodape onCancelar={fechar} salvando={salvando} rotulo="Registrar entrada" />
      </form>
    </Modal>
  );
}

/* ---------- SAÍDA ---------- */
function SaidaModal({ produtoIdInicial, loteIdInicial, tipoInicial }: { produtoIdInicial?: string; loteIdInicial?: string; tipoInicial?: TipoSaidaEstoque }) {
  const { dados, fechar, rpc, confirmar, avisar } = useEstoque();
  const loteInicial = loteIdInicial ? dados.lotes.find((l) => l.id === loteIdInicial) : undefined;
  const [produtoId, setProdutoId] = useState(loteInicial?.produto_id ?? produtoIdInicial ?? '');
  const [tipo, setTipo] = useState<TipoSaidaEstoque>(tipoInicial ?? 'consumo');
  const [data, setData] = useState(hojeISO());
  const [loteId, setLoteId] = useState(loteInicial?.id ?? '');
  const [qtd, setQtd] = useState(loteInicial ? paraInput(loteInicial.qtd_atual) : '');
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const p = dados.produtos.find((x) => x.id === produtoId);
  const lotes = p ? lotesDoProduto(dados, p.id).filter((l) => l.qtd_atual > 0).sort(ordemFEFO) : [];
  const q = parseNumero(qtd);
  const plano = p && q > 0 ? planoSaida(dados, p.id, q, tipo, loteId || null) : null;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      if (!p) throw new Error('Selecione o produto.');
      const quantidade = lerNumero(qtd, { rotulo: 'a quantidade', obrigatorio: true, maiorQue: 0 })!;
      if (!data) throw new Error('Informe a data.');
      if (data > hojeISO()) throw new Error('A data não pode ser futura.');
      const pl = planoSaida(dados, p.id, quantidade, tipo, loteId || null);
      let permitir = false;
      if (pl.falta > 0) {
        permitir = await confirmar({
          titulo: 'Confirmar estoque negativo',
          perigo: true,
          ok: 'Sim, registrar com estoque negativo',
          mensagem: (
            <>
              <p className="mb-2 font-semibold">Estoque insuficiente.</p>
              <p className="mb-2">
                Disponível para esta saída: <b>{fmtQtd(pl.disponivel)} {p.unidade}</b>
                <br />
                Solicitado: <b>{fmtQtd(quantidade)} {p.unidade}</b>
              </p>
              <p>
                Se confirmar, o estoque de <b>{p.nome}</b> ficará <b className="text-negative">negativo em {fmtQtd(pl.falta)} {p.unidade}</b> até você registrar uma entrada ou ajuste.
              </p>
            </>
          ),
        });
        if (!permitir) return;
      }
      setSalvando(true);
      await rpc('estoque_saida', {
        p_produto: p.id,
        p_qtd: quantidade,
        p_tipo: tipo,
        p_data: data,
        p_obs: obs || null,
        p_lote: loteId || null,
        p_permitir_negativo: permitir,
      });
      avisar(`${TIPOS_MOV[tipo]} registrada: ${fmtQtd(quantidade)} ${p.unidade} de ${p.nome}.`);
      fechar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={fechar} title="Registrar saída de produtos" wide>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Produto" obrigatorio className="sm:col-span-2">
            <select
              className="input-field"
              value={produtoId}
              onChange={(e) => {
                setProdutoId(e.target.value);
                setLoteId('');
              }}
            >
              <OpcoesProdutos dados={dados} />
            </select>
          </Campo>
          <Campo rotulo="Tipo de saída">
            <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value as TipoSaidaEstoque)}>
              {SAIDAS.map((t) => (
                <option key={t} value={t}>
                  {TIPOS_MOV[t]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Data" obrigatorio>
            <input type="date" className="input-field" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <Campo rotulo="Lote" dica="Automático segue o FEFO: primeiro a vencer sai primeiro">
            <select className="input-field" value={loteId} onChange={(e) => setLoteId(e.target.value)}>
              <option value="">Automático (FEFO)</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.num_lote || 'sem nº'} · {fmtQtd(l.qtd_atual)} {p?.unidade} · val. {fmtData(l.validade)}
                  {loteVencido(l) ? ' (VENCIDO)' : ''}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo={`Quantidade${p ? ` (${p.unidade})` : ''}`} obrigatorio>
            <input className="input-field" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </Campo>
          <Campo rotulo="Observações" className="sm:col-span-2">
            <textarea className="input-field min-h-[60px]" value={obs} maxLength={300} onChange={(e) => setObs(e.target.value)} placeholder="ex.: consumo da semana, embalagem rasgada…" />
          </Campo>
        </div>
        {p && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
            Estoque atual: <b>{fmtQtd(estoqueAtual(dados, p))} {p.unidade}</b> · disponível (na validade): <b>{fmtQtd(estoqueDisponivel(dados, p))}</b>
            {p.tipo === 'agua' && q > 0 && ` · ≈ ${fmtQtd(r2(q / (p.cap || 5)))} garrafa(s) de ${fmtQtd(p.cap || 5)} L`}
            {plano && (
              <>
                <br />
                Baixa prevista:{' '}
                {plano.alocacao.length
                  ? plano.alocacao.map((a, i) => (
                      <span key={a.lote.id}>
                        {i > 0 && ' + '}
                        <b>{fmtQtd(a.qtd)}</b> do lote {a.lote.num_lote || 'sem nº'} (val. {fmtData(a.lote.validade)})
                      </span>
                    ))
                  : '—'}
                {plano.falta > 0 && (
                  <>
                    <br />
                    <b className="text-negative">
                      Estoque insuficiente: faltam {fmtQtd(plano.falta)} {p.unidade}.
                    </b>
                    {tipo === 'consumo' && !loteId && estoqueVencido(dados, p) > 0 &&
                      ` Há ${fmtQtd(estoqueVencido(dados, p))} em lotes vencidos, que não são usados para consumo — registre o descarte.`}
                  </>
                )}
              </>
            )}
          </div>
        )}
        <Erro texto={erro} />
        <Rodape onCancelar={fechar} salvando={salvando} rotulo="Registrar saída" />
      </form>
    </Modal>
  );
}

/* ---------- PRODUTO ---------- */
function ProdutoModal({ id, tipoPadrao }: { id?: string; tipoPadrao?: TipoProdutoEstoque }) {
  const { dados, fechar, gravar, avisar } = useEstoque();
  const atual = id ? dados.produtos.find((p) => p.id === id) : undefined;
  const t0: TipoProdutoEstoque = atual?.tipo ?? tipoPadrao ?? 'alimento';
  const [nome, setNome] = useState(atual?.nome ?? '');
  const [categoria, setCategoria] = useState(atual?.categoria ?? (t0 === 'agua' ? 'Água' : t0 === 'bebe' ? 'Bebê' : ''));
  const [tipo, setTipo] = useState<TipoProdutoEstoque>(t0);
  const [unidade, setUnidade] = useState(atual?.unidade ?? (t0 === 'agua' ? 'litros' : 'kg'));
  const [localId, setLocalId] = useState(atual?.local_id ?? dados.locais[0]?.id ?? '');
  const [meta, setMeta] = useState(atual ? paraInput(atual.meta) : '');
  const [minimo, setMinimo] = useState(atual ? paraInput(atual.minimo) : '');
  const [cap, setCap] = useState(paraInput(atual?.cap ?? 5));
  const [obs, setObs] = useState(atual?.obs ?? '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      const n = nome.trim();
      if (!n) throw new Error('Informe o nome do produto.');
      if (dados.produtos.some((p) => p.id !== id && p.nome.toLowerCase() === n.toLowerCase())) throw new Error('Já existe um produto com esse nome.');
      if (!categoria.trim()) throw new Error('Informe a categoria.');
      if (!unidade.trim()) throw new Error('Informe a unidade de medida.');
      const m = lerNumero(meta, { rotulo: 'a meta', minimo: 0 }) ?? 0;
      const mn = lerNumero(minimo, { rotulo: 'o mínimo de segurança', minimo: 0 }) ?? 0;
      if (m > 0 && mn > m) throw new Error('O mínimo de segurança não pode ser maior que a meta.');
      const c = tipo === 'agua' ? lerNumero(cap, { rotulo: 'a capacidade da embalagem', obrigatorio: true, maiorQue: 0 }) : null;
      const valores = {
        nome: n,
        categoria: categoria.trim(),
        tipo,
        unidade: unidade.trim(),
        local_id: localId || null,
        meta: r3(m),
        minimo: r3(mn),
        cap: c,
        obs: obs.trim() || null,
      };
      setSalvando(true);
      if (id) await gravar('estoque_produtos', 'update', valores, { coluna: 'id', valor: id });
      else await gravar('estoque_produtos', 'insert', valores);
      avisar(id ? 'Produto atualizado.' : 'Produto cadastrado.');
      fechar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={fechar} title={id ? 'Editar produto' : 'Novo produto'} wide>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Nome do produto" obrigatorio className="sm:col-span-2">
            <input className="input-field" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="Categoria" obrigatorio>
            <input className="input-field" list="estoque-categorias" value={categoria} maxLength={50} onChange={(e) => setCategoria(e.target.value)} />
            <datalist id="estoque-categorias">
              {categoriasDe(dados).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Tipo de controle">
            <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value as TipoProdutoEstoque)}>
              {(Object.keys(TIPOS_PRODUTO) as TipoProdutoEstoque[]).map((t) => (
                <option key={t} value={t}>
                  {TIPOS_PRODUTO[t]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Unidade de medida" obrigatorio>
            <input className="input-field" list="estoque-unidades" value={unidade} maxLength={20} onChange={(e) => setUnidade(e.target.value)} />
            <datalist id="estoque-unidades">
              {UNIDADES.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Local padrão de armazenamento">
            <select className="input-field" value={localId} onChange={(e) => setLocalId(e.target.value)}>
              <OpcoesLocais dados={dados} />
            </select>
          </Campo>
          <Campo rotulo="Quantidade desejada (meta)" dica="0 ou vazio = meta não definida">
            <input className="input-field" inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="ex.: 40" />
          </Campo>
          <Campo rotulo="Quantidade mínima de segurança" dica="Alerta quando o estoque ficar abaixo">
            <input className="input-field" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="ex.: 12" />
          </Campo>
          {tipo === 'agua' && (
            <Campo rotulo="Capacidade padrão da embalagem (L)" obrigatorio>
              <input className="input-field" inputMode="decimal" value={cap} onChange={(e) => setCap(e.target.value)} />
            </Campo>
          )}
          <Campo rotulo="Observações" className="sm:col-span-2">
            <textarea className="input-field min-h-[60px]" value={obs} maxLength={500} onChange={(e) => setObs(e.target.value)} />
          </Campo>
        </div>
        <Erro texto={erro} />
        <Rodape onCancelar={fechar} salvando={salvando} />
      </form>
    </Modal>
  );
}

/* ---------- LOTE (edição + contagem) ---------- */
function LoteModal({ id }: { id: string }) {
  const { dados, fechar, rpc, avisar } = useEstoque();
  const l = dados.lotes.find((x) => x.id === id);
  const p = l ? dados.produtos.find((x) => x.id === l.produto_id) : undefined;
  const [numLote, setNumLote] = useState(l?.num_lote ?? '');
  const [localId, setLocalId] = useState(l?.local_id ?? '');
  const [dataCompra, setDataCompra] = useState(l?.data_compra ?? hojeISO());
  const [dataFab, setDataFab] = useState(l?.data_fab ?? '');
  const [validade, setValidade] = useState(l?.validade ?? '');
  const [fornecedor, setFornecedor] = useState(l?.fornecedor ?? '');
  const [contagem, setContagem] = useState(paraInput(l?.qtd_atual ?? 0));
  const [obs, setObs] = useState(l?.obs ?? '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  if (!l || !p) return null;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      if (!dataCompra) throw new Error('Informe a data da compra.');
      if (dataFab && validade && validade <= dataFab) throw new Error('A validade deve ser posterior à fabricação.');
      const c = lerNumero(contagem, { rotulo: 'a quantidade atual', obrigatorio: true, minimo: l!.saldo_negativo ? -1e9 : 0 })!;
      setSalvando(true);
      await rpc('estoque_atualizar_lote', {
        p_lote: l!.id,
        p_contagem: c,
        p_data_compra: dataCompra,
        p_validade: validade || null,
        p_data_fab: dataFab || null,
        p_num_lote: numLote || null,
        p_valor: l!.valor, // valor não é mais exibido; mantém o que já estava gravado
        p_fornecedor: fornecedor || null,
        p_local: localId || null,
        p_obs: obs || null,
      });
      avisar('Lote atualizado.');
      fechar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={fechar} title={`Editar lote – ${p.nome}`} wide>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Número do lote">
            <input className="input-field" value={numLote} maxLength={40} onChange={(e) => setNumLote(e.target.value)} />
          </Campo>
          <Campo rotulo="Local de armazenamento">
            <select className="input-field" value={localId} onChange={(e) => setLocalId(e.target.value)}>
              <OpcoesLocais dados={dados} />
            </select>
          </Campo>
          <Campo rotulo="Data da compra" obrigatorio>
            <input type="date" className="input-field" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
          </Campo>
          <Campo rotulo="Data de fabricação">
            <input type="date" className="input-field" value={dataFab} onChange={(e) => setDataFab(e.target.value)} />
          </Campo>
          <Campo rotulo="Data de validade">
            <input type="date" className="input-field" value={validade} onChange={(e) => setValidade(e.target.value)} />
          </Campo>
          <Campo rotulo="Fornecedor">
            <input className="input-field" list="estoque-fornecedores-lote" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
            <datalist id="estoque-fornecedores-lote">
              {fornecedoresDe(dados).map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo={`Quantidade atual – contagem (${p.unidade})`} dica="Alterar gera um “Ajuste de inventário” no histórico">
            <input className="input-field" inputMode="decimal" value={contagem} onChange={(e) => setContagem(e.target.value)} />
          </Campo>
          <Campo rotulo="Observações" className="sm:col-span-2">
            <textarea className="input-field min-h-[60px]" value={obs} maxLength={300} onChange={(e) => setObs(e.target.value)} />
          </Campo>
        </div>
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
          Comprado: <b>{fmtQtd(l.qtd_inicial)} {p.unidade}</b>
          {l.cap ? ` em embalagens de ${fmtQtd(l.cap)} L` : ''}. Para corrigir a quantidade comprada, estorne a entrada em Movimentações e registre novamente.
        </p>
        <Erro texto={erro} />
        <Rodape onCancelar={fechar} salvando={salvando} />
      </form>
    </Modal>
  );
}

/* ---------- LOCAL ---------- */
function LocalModal({ id }: { id?: string }) {
  const { dados, fechar, gravar, avisar } = useEstoque();
  const l = id ? dados.locais.find((x) => x.id === id) : undefined;
  const [nome, setNome] = useState(l?.nome ?? '');
  const [cond, setCond] = useState({
    umidade: l?.umidade ?? 'Adequada',
    temperatura: l?.temperatura ?? 'Ambiente',
    sol: l?.sol ?? 'Sem exposição',
    embalagem: l?.embalagem ?? 'Íntegra',
  });
  const [inspecao, setInspecao] = useState(l?.inspecao ?? '');
  const [obs, setObs] = useState(l?.obs ?? '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const rotulos: Record<keyof typeof CONDICOES, string> = { umidade: 'Umidade', temperatura: 'Temperatura', sol: 'Exposição solar', embalagem: 'Integridade das embalagens' };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      const n = nome.trim();
      if (!n) throw new Error('Informe o nome do local.');
      if (dados.locais.some((x) => x.id !== id && x.nome.toLowerCase() === n.toLowerCase())) throw new Error('Já existe um local com esse nome.');
      const valores = { nome: n, ...cond, inspecao: inspecao || null, obs: obs.trim() || null };
      setSalvando(true);
      if (id) await gravar('estoque_locais', 'update', valores, { coluna: 'id', valor: id });
      else await gravar('estoque_locais', 'insert', valores);
      avisar(id ? 'Local atualizado.' : 'Local cadastrado.');
      fechar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={fechar} title={id ? 'Editar local' : 'Novo local de armazenamento'}>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Nome do local" obrigatorio className="sm:col-span-2">
            <input className="input-field" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Despensa da lavanderia" />
          </Campo>
          {(Object.keys(CONDICOES) as (keyof typeof CONDICOES)[]).map((k) => (
            <Campo key={k} rotulo={rotulos[k]}>
              <select className="input-field" value={cond[k]} onChange={(e) => setCond({ ...cond, [k]: e.target.value })}>
                {CONDICOES[k].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Campo>
          ))}
          <Campo rotulo="Última inspeção">
            <input type="date" className="input-field" value={inspecao} onChange={(e) => setInspecao(e.target.value)} />
          </Campo>
          <Campo rotulo="Observações sobre as condições" className="sm:col-span-2">
            <textarea className="input-field min-h-[60px]" value={obs} maxLength={500} onChange={(e) => setObs(e.target.value)} placeholder="ex.: perto da janela no verão; usar caixas fechadas" />
          </Campo>
        </div>
        <Erro texto={erro} />
        <Rodape onCancelar={fechar} salvando={salvando} />
      </form>
    </Modal>
  );
}

/* ---------- INCLUIR ITEM NA LISTA DE COMPRAS ---------- */
function ItemListaModal() {
  const { dados, fechar, gravar, avisar } = useEstoque();
  const naLista = new Set((dados.lista ?? []).map((i) => i.produto_id).filter(Boolean));
  const [origem, setOrigem] = useState<'produto' | 'livre'>('produto');
  const [produtoId, setProdutoId] = useState('');
  const [nome, setNome] = useState('');
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      let valores: Record<string, unknown>;
      if (origem === 'produto') {
        if (!produtoId) throw new Error('Selecione o produto.');
        valores = { produto_id: produtoId, obs: obs.trim() || null };
      } else {
        const n = nome.trim();
        if (!n) throw new Error('Informe o nome do item.');
        if ((dados.lista ?? []).some((i) => !i.produto_id && (i.nome ?? '').trim().toLowerCase() === n.toLowerCase())) throw new Error('Esse item já está na lista.');
        valores = { nome: n, obs: obs.trim() || null };
      }
      setSalvando(true);
      await gravar('estoque_lista', 'insert', valores);
      avisar('Item incluído na lista.');
      fechar();
    } catch (err) {
      const m = (err as Error).message;
      setErro(m.includes('estoque_lista_produto_uk') || m.includes('estoque_lista_nome_uk') ? 'Esse item já está na lista.' : m);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={fechar} title="Incluir item na lista de compras">
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 text-sm font-medium">
          {(['produto', 'livre'] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrigem(o)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${origem === o ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {o === 'produto' ? 'Produto do estoque' : 'Outro item'}
            </button>
          ))}
        </div>
        {origem === 'produto' ? (
          <Campo rotulo="Produto" obrigatorio dica="Meta, estoque atual e status vêm do cadastro do produto">
            <select className="input-field" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
              <OpcoesProdutos dados={dados} filtro={(p) => !naLista.has(p.id)} />
            </select>
          </Campo>
        ) : (
          <Campo rotulo="Nome do item" obrigatorio dica="Para coisas que não são controladas no estoque">
            <input className="input-field" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Papel higiênico" />
          </Campo>
        )}
        <Campo rotulo="Observação">
          <input className="input-field" value={obs} maxLength={200} onChange={(e) => setObs(e.target.value)} placeholder="ex.: tipo 1, marca X, pacote de 5 kg" />
        </Campo>
        <Erro texto={erro} />
        <Rodape onCancelar={fechar} salvando={salvando} rotulo="Incluir" />
      </form>
    </Modal>
  );
}

/** Renderiza o formulário aberto no momento (estado vem do EstoqueContext). */
export function ModaisEstoque() {
  const { modal } = useEstoque();
  if (!modal) return null;
  // `key` força um formulário novo a cada abertura
  switch (modal.tipo) {
    case 'entrada':
      return <EntradaModal key={`e-${modal.produtoId}`} produtoIdInicial={modal.produtoId} />;
    case 'saida':
      return <SaidaModal key={`s-${modal.produtoId}-${modal.loteId}`} produtoIdInicial={modal.produtoId} loteIdInicial={modal.loteId} tipoInicial={modal.tipoSaida} />;
    case 'produto':
      return <ProdutoModal key={`p-${modal.id}`} id={modal.id} tipoPadrao={modal.tipoProduto} />;
    case 'lote':
      return <LoteModal key={`l-${modal.id}`} id={modal.id} />;
    case 'local':
      return <LocalModal key={`c-${modal.id}`} id={modal.id} />;
    case 'itemLista':
      return <ItemListaModal />;
  }
}
