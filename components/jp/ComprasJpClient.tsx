'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { IconCheck, IconEdit, IconPlus, IconSearch, IconTrash } from '@/components/icons';
import { Brilho, MolduraJp, Separador } from '@/components/jp/Decoracao';
import { JpAbas } from '@/components/jp/JpAbas';
import { createBrowserSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { fmtMoeda, paraInput, parseNumero } from '@/lib/estoque/calc';
import { CATEGORIAS_COMPRAS, UNIDADES_COMPRAS, fmtQtd, previstoItem, realItem, resumoCompras } from '@/lib/jpCompras';
import { fonteScript, fonteSerif } from '@/lib/jpFontes';
import type { JpCompra } from '@/types/database';

type Filtro = 'todos' | 'faltam' | 'comprados';

const BTN_AZUL = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#3f6aa6] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#335a92] disabled:opacity-50';
const BTN_CLARO = 'inline-flex items-center justify-center gap-2 rounded-full border border-[#cfdcee] bg-white px-4 py-2 text-sm font-medium text-[#3f6aa6] transition-colors hover:bg-[#f1f5fb]';
const INPUT_JP = 'w-full rounded-full border border-[#d5e0ee] bg-white/90 px-4 py-2 text-sm text-[#2f5288] placeholder:text-[#9db0cb] focus:border-[#3f6aa6] focus:outline-none focus:ring-1 focus:ring-[#3f6aa6]';
const CAMPO = 'w-full rounded-xl border border-[#d5e0ee] bg-white px-3 py-2 text-sm text-[#2f5288] placeholder:text-[#9db0cb] focus:border-[#3f6aa6] focus:outline-none focus:ring-1 focus:ring-[#3f6aa6]';
const ROTULO = 'mb-1 block text-xs font-medium text-[#7c93b5]';

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const ordemCategoria = (c: string) => {
  const i = CATEGORIAS_COMPRAS.indexOf(c);
  return i === -1 ? CATEGORIAS_COMPRAS.length - 1 : i;
};

/* ------------------------------------------------------------------ */
export function ComprasJpClient({ inicial, familiasVao }: { inicial: JpCompra[]; familiasVao: number | null }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [lista, setLista] = useState<JpCompra[]>(inicial);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [editando, setEditando] = useState<JpCompra | 'novo' | null>(null);
  const [categoriaNova, setCategoriaNova] = useState('');
  const [erro, setErro] = useState('');

  const r = resumoCompras(lista);
  const categoriasUsadas = useMemo(() => [...new Set([...CATEGORIAS_COMPRAS, ...lista.map((c) => c.categoria)])], [lista]);
  const brindes = lista.filter((c) => normalizar(c.categoria) === 'brindes').reduce((s, c) => s + c.quantidade, 0);

  const grupos = useMemo(() => {
    const q = normalizar(busca.trim());
    const mapa = new Map<string, JpCompra[]>();
    for (const c of [...lista].sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em))) {
      const g = mapa.get(c.categoria) ?? [];
      g.push(c);
      mapa.set(c.categoria, g);
    }
    return [...mapa.entries()]
      .sort((a, b) => ordemCategoria(a[0]) - ordemCategoria(b[0]) || a[0].localeCompare(b[0]))
      .map(([categoria, itens]) => ({
        categoria,
        itens,
        visiveis: itens.filter(
          (c) =>
            (filtro === 'todos' || (filtro === 'comprados' ? c.comprado : !c.comprado)) &&
            (!q || normalizar(`${c.item} ${c.loja ?? ''} ${c.responsavel ?? ''} ${c.obs ?? ''}`).includes(q))
        ),
      }))
      .filter((g) => g.visiveis.length > 0);
  }, [lista, busca, filtro]);

  async function alternar(c: JpCompra) {
    const antes = lista;
    setLista((l) => l.map((x) => (x.id === c.id ? { ...x, comprado: !x.comprado } : x)));
    const { error } = await supabase.from('jp_compras').update({ comprado: !c.comprado }).eq('id', c.id);
    if (error) {
      setLista(antes);
      setErro(`Não foi possível salvar: ${error.message}`);
    }
  }

  async function excluir(c: JpCompra) {
    if (!window.confirm(`Excluir "${c.item}" da lista de compras?`)) return;
    const { error } = await supabase.from('jp_compras').delete().eq('id', c.id);
    if (error) return setErro(`Não foi possível excluir: ${error.message}`);
    setLista((l) => l.filter((x) => x.id !== c.id));
  }

  const pctItens = r.itens ? (r.comprados / r.itens) * 100 : 0;
  const quadros = [
    { rotulo: 'Itens comprados', valor: `${r.comprados}/${r.itens}`, sub: `${Math.round(pctItens)}% da lista` },
    { rotulo: 'Faltam comprar', valor: String(r.faltam), sub: r.faltam === 1 ? 'item' : 'itens' },
    { rotulo: 'Já gasto', valor: fmtMoeda(r.gasto), sub: 'itens comprados' },
    { rotulo: 'Falta gastar', valor: fmtMoeda(r.faltaGastar), sub: 'previsto do que falta' },
    { rotulo: 'Total estimado', valor: fmtMoeda(r.totalEstimado), sub: `previsto inicial ${fmtMoeda(r.previsto)}`, destaque: true },
  ];

  return (
    <MolduraJp className={cn('mx-auto w-full max-w-[1800px] rounded-[32px] px-3 py-4 sm:px-6 sm:py-6', fonteSerif.className)}>
      <div className="space-y-5">
        <JpAbas atual="compras" />

        {/* Cabeçalho */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#dfe7f2] bg-white/80 px-4 pb-6 pt-5 text-center shadow-[0_10px_40px_-20px_rgba(44,79,134,0.35)] sm:px-8">
          <h1 className={cn('text-5xl leading-tight text-[#4a74b0] sm:text-6xl', fonteScript.className)}>Lista de compras</h1>
          <p className="mt-1 text-sm italic text-[#5d7aa3]">Tudo o que falta para o batizado e o churrasco</p>
          <Separador className="mx-auto my-4 max-w-md" />

          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
            {quadros.map((x) => (
              <div
                key={x.rotulo}
                className={cn(
                  'rounded-2xl border px-3 py-3',
                  x.destaque ? 'col-span-2 border-[#e8d6a8] bg-gradient-to-b from-[#fffaf0] to-[#fbf1da] lg:col-span-1' : 'border-[#dfe7f2] bg-gradient-to-b from-white to-[#f3f7fc]'
                )}
              >
                <dt className={cn('truncate text-[11px] font-medium uppercase tracking-wide', x.destaque ? 'text-[#a8842f]' : 'text-[#7c93b5]')}>{x.rotulo}</dt>
                <dd className={cn('truncate text-2xl font-semibold tabular-nums', x.destaque ? 'text-[#8a6a1e]' : 'text-[#2f5288]')}>{x.valor}</dd>
                <dd className="truncate text-[11px] italic text-[#8aa0bf]">{x.sub}</dd>
              </div>
            ))}
          </dl>

          {r.itens > 0 && (
            <div className="mx-auto mt-4 h-2 max-w-6xl overflow-hidden rounded-full bg-[#e6edf6]" title="Itens comprados">
              <span className="block h-full rounded-full bg-gradient-to-r from-[#3f6aa6] to-[#7c99c4]" style={{ width: `${pctItens}%` }} />
            </div>
          )}

          {familiasVao !== null && (
            <div className="mx-auto mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-[#3f6aa6] px-4 py-1.5 text-xs italic text-white shadow-sm sm:text-sm">
              <Brilho className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {familiasVao} {familiasVao === 1 ? 'família confirmada' : 'famílias confirmadas'} · brindes na lista: {fmtQtd(brindes)}
                {brindes < familiasVao ? ` · faltam ${fmtQtd(familiasVao - brindes)}` : ''}
              </span>
            </div>
          )}
        </section>

        {erro && (
          <button type="button" onClick={() => setErro('')} className="w-full rounded-xl bg-red-50 px-4 py-2.5 text-left text-sm font-medium text-negative">
            {erro} <span className="text-xs text-red-400">(fechar)</span>
          </button>
        )}

        {/* Filtros e ações */}
        <section className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9db0cb]" />
            <input className={cn(INPUT_JP, 'pl-10')} placeholder="Buscar item, loja ou responsável" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-[#d5e0ee] bg-white/90 p-1 text-xs font-semibold">
              {(
                [
                  { id: 'todos', rotulo: 'Todos', n: r.itens },
                  { id: 'faltam', rotulo: 'Falta comprar', n: r.faltam },
                  { id: 'comprados', rotulo: 'Comprados', n: r.comprados },
                ] as { id: Filtro; rotulo: string; n: number }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  className={cn('rounded-full px-3 py-1.5 transition-colors', filtro === f.id ? 'bg-[#3f6aa6] text-white shadow-sm' : 'text-[#5d7aa3] hover:text-[#2f5288]')}
                >
                  {f.rotulo} <span className="tabular-nums opacity-70">{f.n}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className={BTN_AZUL}
              onClick={() => {
                setCategoriaNova('');
                setEditando('novo');
              }}
            >
              <IconPlus className="h-4 w-4" /> Item
            </button>
          </div>
        </section>

        {/* Lista */}
        {lista.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cfdcee] bg-white/80 px-6 py-12 text-center">
            <p className="text-base font-semibold text-[#2f5288]">A lista de compras está vazia</p>
            <p className="mt-1 text-sm italic text-[#7c93b5]">Adicione carnes, bebidas, descartáveis, brindes e o que mais precisar.</p>
            <button type="button" className={cn(BTN_AZUL, 'mt-4')} onClick={() => setEditando('novo')}>
              <IconPlus className="h-4 w-4" /> Adicionar o primeiro item
            </button>
          </div>
        ) : grupos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#cfdcee] bg-white/70 px-4 py-8 text-center text-sm italic text-[#7c93b5]">Nenhum item com esses filtros.</p>
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {grupos.map((g) => {
              const feitos = g.itens.filter((c) => c.comprado).length;
              const total = g.itens.reduce((s, c) => s + (c.comprado ? realItem(c) : previstoItem(c)), 0);
              return (
                <article key={g.categoria} className="overflow-hidden rounded-3xl border border-[#dfe7f2] bg-white/90 shadow-[0_8px_30px_-22px_rgba(44,79,134,0.5)]">
                  <header className="flex items-center gap-3 border-b border-[#e6edf6] bg-gradient-to-b from-[#f5f8fc] to-white px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold italic text-[#2f5288]">{g.categoria}</h3>
                      <p className="truncate text-xs text-[#8aa0bf]">
                        {feitos} de {g.itens.length} comprados · {fmtMoeda(total)}
                      </p>
                    </div>
                    {feitos === g.itens.length && (
                      <span className="shrink-0 rounded-full border border-[#ecd9a8] bg-[#fbf3df] px-2.5 py-1 text-[11px] font-semibold text-[#8a6a1e]">Completo</span>
                    )}
                    <button
                      type="button"
                      title="Adicionar item nesta categoria"
                      onClick={() => {
                        setCategoriaNova(g.categoria);
                        setEditando('novo');
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9db0cb] transition-colors hover:bg-[#eef3f9] hover:text-[#3f6aa6]"
                    >
                      <IconPlus className="h-4 w-4" />
                    </button>
                  </header>
                  <ul className="divide-y divide-[#eef2f8]">
                    {g.visiveis.map((c) => {
                      const valor = c.comprado ? realItem(c) : previstoItem(c);
                      const detalhes = [c.loja, c.responsavel && `por ${c.responsavel}`, c.obs].filter(Boolean).join(' · ');
                      return (
                        <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => alternar(c)}
                            aria-label={c.comprado ? 'Desmarcar comprado' : 'Marcar como comprado'}
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                              c.comprado ? 'border-[#3f6aa6] bg-[#3f6aa6] text-white' : 'border-[#c2cfe1] bg-white text-transparent hover:border-[#3f6aa6]'
                            )}
                          >
                            <IconCheck className="h-3.5 w-3.5" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={cn('truncate text-sm', c.comprado ? 'text-[#9db0cb] line-through' : 'text-[#2f5288]')}>{c.item}</p>
                            <p className="truncate text-[11px] italic text-[#9db0cb]">
                              {fmtQtd(c.quantidade)} {c.unidade}
                              {c.valor_unitario > 0 ? ` × ${fmtMoeda(c.valor_unitario)}` : ''}
                              {detalhes ? ` · ${detalhes}` : ''}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={cn('text-sm font-semibold tabular-nums', c.comprado ? 'text-[#3f6aa6]' : 'text-[#2f5288]')}>{valor > 0 ? fmtMoeda(valor) : '—'}</p>
                            <p className="text-[10px] uppercase tracking-wide text-[#9db0cb]">{c.comprado ? (c.valor_pago !== null ? 'pago' : 'comprado') : 'previsto'}</p>
                          </div>
                          <button type="button" onClick={() => setEditando(c)} className="rounded-full p-1.5 text-[#c2cfe1] hover:bg-[#eef3f9] hover:text-[#3f6aa6]" aria-label="Editar">
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => excluir(c)} className="rounded-full p-1.5 text-[#c2cfe1] hover:bg-red-50 hover:text-negative" aria-label="Excluir">
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {editando && (
        <ItemModal
          item={editando === 'novo' ? null : editando}
          categoriaInicial={categoriaNova}
          categorias={categoriasUsadas}
          proximaOrdem={lista.reduce((m, c) => Math.max(m, c.ordem), 0) + 1}
          onFechar={() => setEditando(null)}
          onSalvo={(c) => {
            setLista((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [...l, c]));
            setEditando(null);
          }}
        />
      )}
    </MolduraJp>
  );
}

/* ---------------------------- adicionar / editar item ---------------------------- */
function ItemModal({
  item,
  categoriaInicial,
  categorias,
  proximaOrdem,
  onFechar,
  onSalvo,
}: {
  item: JpCompra | null;
  categoriaInicial: string;
  categorias: string[];
  proximaOrdem: number;
  onFechar: () => void;
  onSalvo: (c: JpCompra) => void;
}) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [nome, setNome] = useState(item?.item ?? '');
  const [categoria, setCategoria] = useState(item?.categoria ?? (categoriaInicial || 'Outros'));
  const [quantidade, setQuantidade] = useState(item ? paraInput(item.quantidade) : '1');
  const [unidade, setUnidade] = useState(item?.unidade ?? 'un');
  const [valorUnit, setValorUnit] = useState(item && item.valor_unitario > 0 ? paraInput(item.valor_unitario) : '');
  const [comprado, setComprado] = useState(item?.comprado ?? false);
  const [valorPago, setValorPago] = useState(item?.valor_pago !== null && item?.valor_pago !== undefined ? paraInput(item.valor_pago) : '');
  const [loja, setLoja] = useState(item?.loja ?? '');
  const [responsavel, setResponsavel] = useState(item?.responsavel ?? '');
  const [obs, setObs] = useState(item?.obs ?? '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const qtdNum = parseNumero(quantidade);
  const vuNum = valorUnit.trim() ? parseNumero(valorUnit) : 0;
  const previsto = !Number.isNaN(qtdNum) && !Number.isNaN(vuNum) ? previstoItem({ quantidade: qtdNum, valor_unitario: vuNum }) : 0;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro('Informe o item.');
    if (Number.isNaN(qtdNum) || qtdNum < 0) return setErro('Quantidade inválida.');
    if (Number.isNaN(vuNum) || vuNum < 0) return setErro('Valor unitário inválido.');
    const pago = valorPago.trim() ? parseNumero(valorPago) : null;
    if (pago !== null && (Number.isNaN(pago) || pago < 0)) return setErro('Valor pago inválido.');
    setSalvando(true);
    setErro('');
    const dados = {
      item: nome.trim(),
      categoria: categoria.trim() || 'Outros',
      quantidade: qtdNum,
      unidade: unidade.trim() || 'un',
      valor_unitario: vuNum,
      comprado,
      valor_pago: comprado ? pago : null,
      loja: loja.trim() || null,
      responsavel: responsavel.trim() || null,
      obs: obs.trim() || null,
    };
    const { data, error } = item
      ? await supabase.from('jp_compras').update(dados).eq('id', item.id).select().single()
      : await supabase.from('jp_compras').insert({ ...dados, ordem: proximaOrdem }).select().single();
    setSalvando(false);
    if (error || !data) return setErro(`Não foi possível salvar: ${error?.message ?? 'erro desconhecido'}`);
    const n = (v: unknown) => Number(v) || 0;
    const c = data as JpCompra;
    onSalvo({ ...c, quantidade: n(c.quantidade), valor_unitario: n(c.valor_unitario), valor_pago: c.valor_pago === null ? null : n(c.valor_pago) });
  }

  return (
    <Modal open onClose={onFechar} title={item ? 'Editar item' : 'Novo item'}>
      <form onSubmit={salvar} className={cn('space-y-4', fonteSerif.className)}>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div>
            <label className={ROTULO}>Item</label>
            <input className={CAMPO} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Picanha, Refrigerante 2 L, Pratos descartáveis" autoFocus />
          </div>
          <div>
            <label className={ROTULO}>Categoria</label>
            <input className={CAMPO} list="jp-categorias" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
            <datalist id="jp-categorias">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={ROTULO}>Quantidade</label>
            <input className={CAMPO} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <label className={ROTULO}>Unidade</label>
            <input className={CAMPO} list="jp-unidades" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
            <datalist id="jp-unidades">
              {UNIDADES_COMPRAS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={ROTULO}>Valor unitário</label>
            <input className={CAMPO} value={valorUnit} onChange={(e) => setValorUnit(e.target.value)} inputMode="decimal" placeholder="R$ 0,00" />
          </div>
        </div>
        <p className="text-xs italic text-[#7c93b5]">
          Previsto: <b className="not-italic text-[#2f5288]">{fmtMoeda(previsto)}</b>
        </p>

        <label className="flex items-center gap-2 text-sm text-[#2f5288]">
          <input type="checkbox" checked={comprado} onChange={(e) => setComprado(e.target.checked)} className="h-4 w-4 rounded border-[#c2cfe1]" />
          Já comprado
        </label>
        {comprado && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={ROTULO}>Valor pago (total)</label>
              <input className={CAMPO} value={valorPago} onChange={(e) => setValorPago(e.target.value)} inputMode="decimal" placeholder={`Se vazio, usa ${fmtMoeda(previsto)}`} />
            </div>
            <div>
              <label className={ROTULO}>Onde comprou</label>
              <input className={CAMPO} value={loja} onChange={(e) => setLoja(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={ROTULO}>Quem vai comprar / comprou</label>
            <input className={CAMPO} value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Opcional" />
          </div>
          {!comprado && (
            <div>
              <label className={ROTULO}>Onde comprar</label>
              <input className={CAMPO} value={loja} onChange={(e) => setLoja(e.target.value)} placeholder="Opcional" />
            </div>
          )}
        </div>
        <div>
          <label className={ROTULO}>Observação</label>
          <input className={CAMPO} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
        </div>
        {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-negative">{erro}</p>}
        <div className="flex justify-end gap-2 border-t border-[#e6edf6] pt-4">
          <button type="button" className={BTN_CLARO} onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className={BTN_AZUL} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
