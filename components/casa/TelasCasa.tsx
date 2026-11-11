'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCasa } from '@/components/casa/CasaContext';
import { Badge, Barra, BotaoIcone, Secao, TD, TDN, TH, THN, Tabela, Vazio, type Tom } from '@/components/estoque/ui';
import { IconCheck, IconDesfazer, IconEdit, IconPlanilha, IconPlus, IconSearch, IconTrash, IconWhatsApp } from '@/components/icons';
import { fmtData, fmtMoeda, soma } from '@/lib/estoque/calc';
import { cicloTarefa, emojiCasa } from '@/lib/casa/visual';
import { baixarArquivo, nomeArquivo, relatorioXlsx } from '@/lib/estoque/exportar';
import {
  STATUS_GARANTIA,
  STATUS_TAREFA,
  categoriaTarefa,
  linkWhatsApp,
  nomeTarefa,
  ordemTarefas,
  relatorioHistorico,
  statusGarantia,
  statusTarefa,
  textoFrequencia,
  textoPrazoTarefa,
  type StatusGarantia,
  type StatusTarefa,
} from '@/lib/casa/calc';
import type { CasaItem, CasaPrestador, CasaTarefa } from '@/types/database';

export const TOM_TAREFA: Record<StatusTarefa, Tom> = { vencida: 'vermelho', breve: 'amarelo', emdia: 'verde', semdata: 'cinza', pausada: 'cinza' };
const TOM_GARANTIA: Record<StatusGarantia, Tom> = { vencida: 'cinza', breve: 'laranja', ok: 'verde', none: 'cinza' };

function Cabecalho({ titulo, descricao, children }: { titulo: string; descricao?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Casa</p>
        <h2 className="text-xl font-bold text-gray-900">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-sm text-gray-500">{descricao}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function StatusBadge({ t }: { t: CasaTarefa }) {
  const s = statusTarefa(t);
  return <Badge tom={TOM_TAREFA[s]}>{STATUS_TAREFA[s]}</Badge>;
}

/* ---------- lista de manutenções (painel e tela de manutenções) ---------- */
function TabelaTarefas({ tarefas, compacta }: { tarefas: CasaTarefa[]; compacta?: boolean }) {
  const { dados, abrir, gravar, confirmar, avisar } = useCasa();

  async function excluir(t: CasaTarefa) {
    const n = dados.execucoes.filter((e) => e.tarefa_id === t.id).length;
    const ok = await confirmar({
      titulo: 'Excluir manutenção',
      perigo: true,
      ok: 'Excluir',
      mensagem: (
        <>
          Excluir <b>{nomeTarefa(dados, t)}</b>?{n > 0 && <p className="mt-2">O histórico dela ({n} registro(s)) também será apagado. Para só parar os alertas, edite e desmarque “ativa”.</p>}
        </>
      ),
    });
    if (!ok) return;
    try {
      await gravar('casa_tarefas', 'delete', undefined, t.id);
      avisar('Manutenção excluída.');
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }

  if (!tarefas.length) return <Vazio>Nenhuma manutenção aqui.</Vazio>;
  return (
    <Tabela minW={compacta ? 640 : 980}>
      <thead>
        <tr>
          <th className={TH}>Manutenção</th>
          <th className={TH}>Frequência</th>
          {!compacta && <th className={TH}>Última vez</th>}
          <th className={TH}>Próxima</th>
          <th className={THN}>Prazo</th>
          <th className={TH}>Status</th>
          {!compacta && <th className={THN}>Custo est.</th>}
          {!compacta && <th className={TH}>Prestador</th>}
          <th className={TH} />
        </tr>
      </thead>
      <tbody>
        {tarefas.map((t) => {
          const s = statusTarefa(t);
          const item = t.item_id ? dados.itens.find((i) => i.id === t.item_id) : undefined;
          return (
            <tr key={t.id} className={s === 'pausada' ? 'text-gray-400' : 'hover:bg-gray-50/60'}>
              <td className={TD}>
                <p className="font-semibold text-gray-900">{t.titulo}</p>
                <p className="text-xs text-gray-400">
                  {item ? `${item.nome}${item.comodo ? ` · ${item.comodo}` : ''}` : 'Geral da casa'} · {categoriaTarefa(dados, t)}
                </p>
              </td>
              <td className={TD}>{textoFrequencia(t.freq_valor, t.freq_unidade)}</td>
              {!compacta && <td className={TD}>{fmtData(t.ultima_execucao)}</td>}
              <td className={`${TD} font-semibold`}>{fmtData(t.proxima_data)}</td>
              <td className={`${TDN} ${s === 'vencida' ? 'font-semibold text-negative' : ''}`}>{textoPrazoTarefa(t)}</td>
              <td className={TD}>
                <StatusBadge t={t} />
              </td>
              {!compacta && <td className={TDN}>{t.custo_estimado ? fmtMoeda(t.custo_estimado) : '—'}</td>}
              {!compacta && <td className={TD}>{dados.prestadores.find((p) => p.id === t.prestador_id)?.nome ?? '—'}</td>}
              <td className={TD}>
                <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                  <button type="button" className="btn-secondary mr-1 !px-2.5 !py-1 text-xs" onClick={() => abrir({ tipo: 'feito', tarefaId: t.id })}>
                    <IconCheck className="h-3.5 w-3.5" /> Feito
                  </button>
                  <BotaoIcone titulo="Editar" onClick={() => abrir({ tipo: 'tarefa', id: t.id })}>
                    <IconEdit className="h-4 w-4" />
                  </BotaoIcone>
                  {!compacta && (
                    <BotaoIcone titulo="Excluir" perigo onClick={() => excluir(t)}>
                      <IconTrash className="h-4 w-4" />
                    </BotaoIcone>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Tabela>
  );
}

/* ---------- manutenções em cartões ---------- */
function CartoesTarefas({ tarefas }: { tarefas: CasaTarefa[] }) {
  const { dados, abrir } = useCasa();
  if (!tarefas.length) return <Secao><Vazio>Nenhuma manutenção aqui.</Vazio></Secao>;
  const grupos: Record<string, CasaTarefa[]> = {};
  for (const t of tarefas) (grupos[categoriaTarefa(dados, t)] = grupos[categoriaTarefa(dados, t)] || []).push(t);
  const BORDA: Record<StatusTarefa, string> = { vencida: 'border-l-red-500', breve: 'border-l-amber-500', emdia: 'border-l-emerald-500', semdata: 'border-l-gray-300', pausada: 'border-l-gray-200' };
  const COR_PRAZO: Record<StatusTarefa, string> = { vencida: 'text-red-600', breve: 'text-amber-700', emdia: 'text-gray-900', semdata: 'text-gray-400', pausada: 'text-gray-400' };
  return (
    <div className="space-y-6">
      {Object.entries(grupos).map(([cat, lista]) => (
        <section key={cat}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <span aria-hidden>{emojiCasa(cat)}</span> {cat}
            <span className="rounded-full bg-gray-100 px-2 text-xs font-medium text-gray-500">{lista.length}</span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((t) => {
              const s = statusTarefa(t);
              const item = t.item_id ? dados.itens.find((i) => i.id === t.item_id) : undefined;
              const ciclo = cicloTarefa(t);
              const prest = dados.prestadores.find((p) => p.id === t.prestador_id);
              return (
                <div key={t.id} className={`flex flex-col rounded-2xl border border-l-4 border-gray-100 bg-white p-4 shadow-soft transition hover:shadow-card ${BORDA[s]} ${s === 'pausada' ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">{t.titulo}</p>
                      <p className="truncate text-xs text-gray-400">{item ? `${item.nome}${item.comodo ? ` · ${item.comodo}` : ''}` : 'Geral da casa'}</p>
                    </div>
                    <StatusBadge t={t} />
                  </div>
                  <p className={`mt-3 text-2xl font-bold tabular-nums ${COR_PRAZO[s]}`}>
                    {s === 'semdata' ? 'Sem data' : s === 'pausada' ? 'Pausada' : textoPrazoTarefa(t)}
                  </p>
                  <div className="mt-2">{ciclo !== null ? <Barra pct={ciclo} tom={TOM_TAREFA[s]} /> : <div className="h-2 rounded-full border border-dashed border-gray-200" />}</div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                    <dt className="text-gray-400">Frequência</dt>
                    <dd className="text-right text-gray-700">{textoFrequencia(t.freq_valor, t.freq_unidade)}</dd>
                    <dt className="text-gray-400">Última vez</dt>
                    <dd className="text-right text-gray-700">{fmtData(t.ultima_execucao)}</dd>
                    <dt className="text-gray-400">Próxima</dt>
                    <dd className="text-right font-semibold text-gray-900">{fmtData(t.proxima_data)}</dd>
                    {(t.custo_estimado > 0 || prest) && (
                      <>
                        <dt className="text-gray-400">{prest ? 'Prestador' : 'Custo est.'}</dt>
                        <dd className="truncate text-right text-gray-700">{prest ? prest.nome : fmtMoeda(t.custo_estimado)}</dd>
                      </>
                    )}
                  </dl>
                  <div className="mt-auto flex items-center gap-1.5 border-t border-gray-50 pt-3">
                    <button type="button" className="flex-1 rounded-xl bg-amber-50 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100" onClick={() => abrir({ tipo: 'feito', tarefaId: t.id })}>
                      <IconCheck className="mr-1 inline h-3.5 w-3.5" /> Feito
                    </button>
                    <BotaoIcone titulo="Editar" onClick={() => abrir({ tipo: 'tarefa', id: t.id })}>
                      <IconEdit className="h-4 w-4" />
                    </BotaoIcone>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------- MANUTENÇÕES PREVENTIVAS ---------- */
type Visao = 'equipamentos' | 'cartoes' | 'lista';
const VISOES: { id: Visao; rotulo: string }[] = [
  { id: 'equipamentos', rotulo: 'Por equipamento' },
  { id: 'cartoes', rotulo: 'Por categoria' },
  { id: 'lista', rotulo: 'Lista' },
];
export function ManutencoesCasa() {
  const { dados, abrir } = useCasa();
  const params = useSearchParams();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<'' | StatusTarefa>((params.get('status') as StatusTarefa) || '');
  const [categoria, setCategoria] = useState('');
  const [visao, setVisao] = useState<Visao>((VISOES.find((v) => v.id === params.get('visao'))?.id) ?? 'equipamentos');
  useEffect(() => {
    if (params.get('visao')) return;
    try {
      const v = localStorage.getItem('life-casa-visao');
      if (v === 'cartoes' || v === 'lista' || v === 'equipamentos') setVisao(v);
    } catch {}
  }, [params]);
  function trocarVisao(v: Visao) {
    setVisao(v);
    try {
      localStorage.setItem('life-casa-visao', v);
    } catch {}
  }
  const q = busca.toLowerCase();
  const cats = [...new Set(dados.tarefas.map((t) => categoriaTarefa(dados, t)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const lista = dados.tarefas
    .filter((t) => (!q || nomeTarefa(dados, t).toLowerCase().includes(q)) && (!status || statusTarefa(t) === status) && (!categoria || categoriaTarefa(dados, t) === categoria))
    .sort(ordemTarefas);
  return (
    <div>
      <Cabecalho titulo="Manutenções preventivas" descricao="Equipamentos da casa e o que precisa ser feito em cada um, de quanto em quanto tempo">
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'item' })}>
          <IconPlus className="h-4 w-4" /> Novo equipamento
        </button>
        <button type="button" className="btn-primary" onClick={() => abrir({ tipo: 'tarefa' })}>
          <IconPlus className="h-4 w-4" /> Nova manutenção
        </button>
      </Cabecalho>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className="input-field !pl-9" placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="input-field !w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_TAREFA) as StatusTarefa[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_TAREFA[s]}
            </option>
          ))}
        </select>
        <select className="input-field !w-auto" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <div className="ml-auto flex rounded-xl bg-gray-100 p-1 text-xs font-semibold" role="group" aria-label="Forma de exibição">
          {VISOES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => trocarVisao(v.id)}
              aria-pressed={visao === v.id}
              className={`rounded-lg px-3 py-1.5 transition ${visao === v.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {v.rotulo}
            </button>
          ))}
        </div>
      </div>
      {visao === 'equipamentos' ? (
        <PorEquipamento tarefas={lista} filtrando={!!(q || status || categoria)} busca={busca} />
      ) : visao === 'cartoes' ? (
        <CartoesTarefas tarefas={lista} />
      ) : (
        <Secao semPadding>
          <TabelaTarefas tarefas={lista} />
        </Secao>
      )}
      <p className="mt-3 text-xs text-gray-400">
        Clique em <b>Feito</b> quando realizar uma manutenção: ela vai para o histórico e a próxima data é calculada pela frequência.
      </p>
    </div>
  );
}

/* ---------- equipamentos com as manutenções de cada um ---------- */
function LinhaManutencao({ t }: { t: CasaTarefa }) {
  const { abrir } = useCasa();
  const s = statusTarefa(t);
  const ciclo = cicloTarefa(t);
  const cor = s === 'vencida' ? 'text-red-600' : s === 'breve' ? 'text-amber-700' : s === 'emdia' ? 'text-gray-600' : 'text-gray-400';
  return (
    <li className={`group rounded-xl px-2 py-2 transition-colors hover:bg-gray-50 ${s === 'pausada' ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => abrir({ tipo: 'tarefa', id: t.id })} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-gray-800 hover:text-amber-700" title="Editar manutenção">
          {t.titulo}
        </button>
        <span className={`shrink-0 text-xs font-semibold tabular-nums ${cor}`}>{s === 'semdata' ? 'sem data' : s === 'pausada' ? 'pausada' : textoPrazoTarefa(t)}</span>
        <BotaoIcone titulo={`Marcar “${t.titulo}” como feito`} onClick={() => abrir({ tipo: 'feito', tarefaId: t.id })}>
          <IconCheck className="h-4 w-4" />
        </BotaoIcone>
      </div>
      <div className="mt-1 pr-9">{ciclo !== null ? <Barra pct={ciclo} tom={TOM_TAREFA[s]} /> : <div className="h-2 rounded-full border border-dashed border-gray-200" />}</div>
      <p className="mt-0.5 text-[11px] text-gray-400">
        {textoFrequencia(t.freq_valor, t.freq_unidade)}
        {t.proxima_data ? ` · próxima ${fmtData(t.proxima_data)}` : ' · clique em ✓ e informe a última vez'}
      </p>
    </li>
  );
}

function PorEquipamento({ tarefas, filtrando, busca }: { tarefas: CasaTarefa[]; filtrando: boolean; busca: string }) {
  const { dados, abrir, gravar, confirmar, avisar } = useCasa();

  async function excluir(i: CasaItem) {
    const n = dados.tarefas.filter((t) => t.item_id === i.id).length;
    const ok = await confirmar({
      titulo: 'Excluir equipamento',
      perigo: true,
      ok: 'Excluir',
      mensagem: (
        <>
          Excluir <b>{i.nome}</b>?{n > 0 && <p className="mt-2">As {n} manutenção(ões) deste equipamento e o histórico delas também serão apagados.</p>}
        </>
      ),
    });
    if (!ok) return;
    try {
      await gravar('casa_itens', 'delete', undefined, i.id);
      avisar('Equipamento excluído.');
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }

  const PESO: Record<StatusTarefa, number> = { vencida: 0, breve: 1, semdata: 2, emdia: 3, pausada: 4 };
  const pior = (l: CasaTarefa[]) => (l.length ? Math.min(...l.map((t) => PESO[statusTarefa(t)])) : 5);
  const q = busca.trim().toLowerCase();
  const itens = dados.itens
    .map((i) => ({ i, lista: tarefas.filter((t) => t.item_id === i.id) }))
    .filter(({ i, lista }) => !filtrando || lista.length > 0 || (!!q && `${i.nome} ${i.categoria} ${i.comodo ?? ''}`.toLowerCase().includes(q)))
    .sort((a, b) => pior(a.lista) - pior(b.lista) || a.i.nome.localeCompare(b.i.nome, 'pt-BR'));
  const gerais = tarefas.filter((t) => !t.item_id);
  const BORDA = ['border-l-red-500', 'border-l-amber-500', 'border-l-gray-300', 'border-l-emerald-500', 'border-l-gray-200', 'border-l-gray-200'];

  if (!itens.length && !gerais.length)
    return (
      <Secao>
        <Vazio>{filtrando ? 'Nada encontrado com esses filtros.' : 'Cadastre os equipamentos da casa (ar-condicionado, caixa d’água, purificador…) e as manutenções de cada um.'}</Vazio>
      </Secao>
    );

  return (
    <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {itens.map(({ i, lista }) => {
        const g = statusGarantia(i);
        const ordenadas = [...lista].sort(ordemTarefas);
        return (
          <div key={i.id} className={`rounded-2xl border border-l-4 border-gray-100 bg-white p-4 shadow-soft transition hover:shadow-card ${BORDA[pior(lista)]}`}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl" aria-hidden>
                {emojiCasa(i.categoria)}
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-base font-semibold text-gray-900">{i.nome}</h4>
                <p className="truncate text-xs text-gray-500">
                  {i.categoria}
                  {i.comodo ? ` · ${i.comodo}` : ''}
                  {i.marca || i.modelo ? ` · ${[i.marca, i.modelo].filter(Boolean).join(' ')}` : ''}
                </p>
              </div>
              <BotaoIcone titulo="Editar equipamento" onClick={() => abrir({ tipo: 'item', id: i.id })}>
                <IconEdit className="h-4 w-4" />
              </BotaoIcone>
              <BotaoIcone titulo="Excluir equipamento" perigo onClick={() => excluir(i)}>
                <IconTrash className="h-4 w-4" />
              </BotaoIcone>
            </div>
            {(g !== 'none' || i.data_instalacao) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {g !== 'none' && <Badge tom={TOM_GARANTIA[g]}>{`${STATUS_GARANTIA[g]}${i.garantia_ate ? ` · ${fmtData(i.garantia_ate)}` : ''}`}</Badge>}
                {i.data_instalacao && (
                  <Badge tom="cinza" ponto={false}>
                    Instalado em {fmtData(i.data_instalacao)}
                  </Badge>
                )}
              </div>
            )}
            {ordenadas.length ? (
              <ul className="mt-2 space-y-0.5">
                {ordenadas.map((t) => (
                  <LinhaManutencao key={t.id} t={t} />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-400">Nenhuma manutenção para este equipamento.</p>
            )}
            {i.obs && <p className="mt-2 text-xs text-gray-500">{i.obs}</p>}
            <button type="button" className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50" onClick={() => abrir({ tipo: 'tarefa', itemId: i.id })}>
              <IconPlus className="h-3.5 w-3.5" /> Manutenção para este equipamento
            </button>
          </div>
        );
      })}
      {gerais.length > 0 && (
        <div className={`rounded-2xl border border-l-4 border-gray-100 bg-white p-4 shadow-soft transition hover:shadow-card ${BORDA[pior(gerais)]}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl" aria-hidden>
              🏡
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-semibold text-gray-900">Geral da casa</h4>
              <p className="text-xs text-gray-500">Manutenções que não são de um equipamento</p>
            </div>
          </div>
          <ul className="mt-2 space-y-0.5">
            {[...gerais].sort(ordemTarefas).map((t) => (
              <LinhaManutencao key={t.id} t={t} />
            ))}
          </ul>
          <button type="button" className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50" onClick={() => abrir({ tipo: 'tarefa' })}>
            <IconPlus className="h-3.5 w-3.5" /> Manutenção geral
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- HISTÓRICO ---------- */
export function HistoricoCasa() {
  const { dados, rpc, confirmar, avisar } = useCasa();
  const [tarefaId, setTarefaId] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const lista = dados.execucoes
    .filter((e) => (!tarefaId || e.tarefa_id === tarefaId) && (!de || e.data >= de) && (!ate || e.data <= ate))
    .sort((a, b) => b.data.localeCompare(a.data) || b.criado_em.localeCompare(a.criado_em));
  const total = soma(lista, (e) => e.custo);

  async function desfazer(id: string) {
    const ok = await confirmar({
      titulo: 'Desfazer registro',
      ok: 'Desfazer',
      mensagem: 'Remover este registro do histórico? Se for o mais recente da manutenção, ela volta para as datas anteriores.',
    });
    if (!ok) return;
    try {
      await rpc('casa_desfazer_execucao', { p_exec: id });
      avisar('Registro removido.');
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }

  return (
    <div>
      <Cabecalho titulo="Histórico" descricao="Tudo o que já foi feito, com custos e prestadores">
        <button type="button" className="btn-secondary" onClick={() => baixarArquivo(`${nomeArquivo('historico-manutencoes')}.xlsx`, relatorioXlsx('Histórico de manutenções da casa', relatorioHistorico(dados, lista)))}>
          <IconPlanilha className="h-4 w-4" /> Excel
        </button>
      </Cabecalho>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input-field !w-auto" value={tarefaId} onChange={(e) => setTarefaId(e.target.value)}>
          <option value="">Todas as manutenções</option>
          {[...dados.tarefas].sort(ordemTarefas).map((t) => (
            <option key={t.id} value={t.id}>
              {nomeTarefa(dados, t)}
            </option>
          ))}
        </select>
        <input type="date" className="input-field !w-auto" title="De" value={de} onChange={(e) => setDe(e.target.value)} />
        <input type="date" className="input-field !w-auto" title="Até" value={ate} onChange={(e) => setAte(e.target.value)} />
        <span className="ml-auto text-sm text-gray-600">
          {lista.length} registro(s) · total <b>{fmtMoeda(total)}</b>
        </span>
      </div>
      <Secao semPadding>
        {lista.length ? (
          <Tabela minW={760}>
            <thead>
              <tr>
                <th className={TH}>Data</th>
                <th className={TH}>Manutenção</th>
                <th className={TH}>Quem fez</th>
                <th className={THN}>Custo</th>
                <th className={TH}>Observações</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const t = dados.tarefas.find((x) => x.id === e.tarefa_id);
                return (
                  <tr key={e.id} className="hover:bg-gray-50/60">
                    <td className={TD}>{fmtData(e.data)}</td>
                    <td className={`${TD} font-semibold`}>{t ? nomeTarefa(dados, t) : '—'}</td>
                    <td className={TD}>{dados.prestadores.find((p) => p.id === e.prestador_id)?.nome ?? 'Nós mesmos'}</td>
                    <td className={TDN}>{e.custo ? fmtMoeda(e.custo) : '—'}</td>
                    <td className={`${TD} max-w-[280px]`}>{e.obs}</td>
                    <td className={TD}>
                      <BotaoIcone titulo="Desfazer" onClick={() => desfazer(e.id)}>
                        <IconDesfazer className="h-4 w-4" />
                      </BotaoIcone>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tabela>
        ) : (
          <Vazio>Nenhum registro. Use “Feito” nas manutenções para registrar.</Vazio>
        )}
      </Secao>
    </div>
  );
}

/* ---------- PRESTADORES ---------- */
export function PrestadoresCasa() {
  const { dados, abrir, gravar, confirmar, avisar } = useCasa();

  async function excluir(p: CasaPrestador) {
    const ok = await confirmar({ titulo: 'Excluir prestador', perigo: true, ok: 'Excluir', mensagem: <>Excluir <b>{p.nome}</b>? O histórico é mantido, sem o nome do prestador.</> });
    if (!ok) return;
    try {
      await gravar('casa_prestadores', 'delete', undefined, p.id);
      avisar('Prestador excluído.');
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }

  return (
    <div>
      <Cabecalho titulo="Prestadores de serviço" descricao="Contatos de quem faz as manutenções da casa">
        <button type="button" className="btn-primary" onClick={() => abrir({ tipo: 'prestador' })}>
          <IconPlus className="h-4 w-4" /> Novo prestador
        </button>
      </Cabecalho>
      {dados.prestadores.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dados.prestadores.map((p) => {
            const servicos = dados.execucoes.filter((e) => e.prestador_id === p.id);
            const wa = linkWhatsApp(p.telefone);
            const ultimo = servicos[0];
            return (
              <Secao key={p.id}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-semibold text-gray-900">{p.nome}</h4>
                    {p.servico && <p className="text-xs text-gray-500">{p.servico}</p>}
                  </div>
                  <BotaoIcone titulo="Editar" onClick={() => abrir({ tipo: 'prestador', id: p.id })}>
                    <IconEdit className="h-4 w-4" />
                  </BotaoIcone>
                  <BotaoIcone titulo="Excluir" perigo onClick={() => excluir(p)}>
                    <IconTrash className="h-4 w-4" />
                  </BotaoIcone>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  {p.telefone && (
                    <p>
                      <a href={`tel:${p.telefone.replace(/[^\d+]/g, '')}`} className="text-brand-600 hover:underline">
                        {p.telefone}
                      </a>
                    </p>
                  )}
                  {p.email && (
                    <p>
                      <a href={`mailto:${p.email}`} className="text-brand-600 hover:underline">
                        {p.email}
                      </a>
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {servicos.length} serviço(s) · total pago {fmtMoeda(soma(servicos, (e) => e.custo))}
                    {ultimo ? ` · último em ${fmtData(ultimo.data)}` : ''}
                  </p>
                  {p.obs && <p className="text-xs text-gray-500">{p.obs}</p>}
                </div>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                    <IconWhatsApp className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
              </Secao>
            );
          })}
        </div>
      ) : (
        <Secao>
          <Vazio>Nenhum prestador cadastrado.</Vazio>
        </Secao>
      )}
    </div>
  );
}
