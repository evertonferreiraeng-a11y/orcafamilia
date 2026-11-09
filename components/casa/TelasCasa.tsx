'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useCasa } from '@/components/casa/CasaContext';
import { Aviso, Badge, BotaoIcone, Kpi, Secao, TD, TDN, TH, THN, Tabela, Vazio, type Tom } from '@/components/estoque/ui';
import { IconCheck, IconDesfazer, IconEdit, IconPlanilha, IconPlus, IconSearch, IconTrash, IconWhatsApp } from '@/components/icons';
import { fmtData, fmtMesCurto, fmtMesLongo, fmtMoeda, hojeISO, soma, ultimosMeses } from '@/lib/estoque/calc';
import { baixarArquivo, nomeArquivo, relatorioXlsx } from '@/lib/estoque/exportar';
import {
  STATUS_GARANTIA,
  STATUS_TAREFA,
  agenda,
  categoriaTarefa,
  custoAnualEstimado,
  gastoNoPeriodo,
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

const TOM_TAREFA: Record<StatusTarefa, Tom> = { vencida: 'vermelho', breve: 'amarelo', emdia: 'verde', semdata: 'cinza', pausada: 'cinza' };
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

/* ---------- PAINEL ---------- */
export function PainelCasa() {
  const { dados, abrir } = useCasa();
  const hoje = hojeISO();
  const ativas = dados.tarefas.filter((t) => t.ativa);
  const conta = (s: StatusTarefa) => dados.tarefas.filter((t) => statusTarefa(t) === s).length;
  const atencao = dados.tarefas.filter((t) => ['vencida', 'breve'].includes(statusTarefa(t))).sort(ordemTarefas);
  const semData = dados.tarefas.filter((t) => statusTarefa(t) === 'semdata').sort(ordemTarefas);
  const garantias = dados.itens.filter((i) => statusGarantia(i) === 'breve');
  const eventos = agenda(dados, 6).filter((e) => !e.atrasada);
  const porMes: Record<string, typeof eventos> = {};
  for (const e of eventos) (porMes[e.data.slice(0, 7)] = porMes[e.data.slice(0, 7)] || []).push(e);
  const grafico = ultimosMeses(12).map((k) => ({ mes: fmtMesCurto(k), gasto: gastoNoPeriodo(dados, k) }));

  return (
    <div>
      <Cabecalho titulo="Painel da casa" descricao="Manutenções periódicas, garantias e gastos com a casa">
        <button type="button" className="btn-primary" onClick={() => abrir({ tipo: 'tarefa' })}>
          <IconPlus className="h-4 w-4" /> Nova manutenção
        </button>
      </Cabecalho>

      {semData.length > 0 && (
        <Aviso tom="azul" acao={<Link href="/casa/manutencoes?status=semdata" className="btn-secondary">Definir datas</Link>}>
          <b>{semData.length} manutenção(ões) sem data.</b> Para cada uma, clique em <b>Feito</b> e informe quando foi feita pela última vez — o sistema calcula a próxima.
        </Aviso>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi titulo="Vencidas" valor={conta('vencida')} tom="vermelho" sub="fazer o quanto antes" />
        <Kpi titulo="Vencem em breve" valor={conta('breve')} tom="amarelo" sub="dentro do aviso" />
        <Kpi titulo="Em dia" valor={conta('emdia')} tom="verde" sub={`de ${ativas.length} ativas`} />
        <Kpi titulo="Sem data" valor={conta('semdata')} sub="informe a última vez" />
        <Kpi titulo={`Gasto em ${hoje.slice(0, 4)}`} valor={fmtMoeda(gastoNoPeriodo(dados, hoje.slice(0, 4)))} tom="azul" sub={`este mês: ${fmtMoeda(gastoNoPeriodo(dados, hoje.slice(0, 7)))}`} />
        <Kpi titulo="Custo anual estimado" valor={fmtMoeda(custoAnualEstimado(dados))} tom="azul" sub="manutenções ativas" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Secao titulo="Precisa de atenção" extra={<Link href="/casa/manutencoes" className="text-xs font-semibold text-brand-600">Ver todas</Link>} semPadding>
          {atencao.length ? <TabelaTarefas tarefas={atencao} compacta /> : <Vazio>Tudo em dia por aqui. 🏡</Vazio>}
        </Secao>
        <Secao titulo="Próximos 6 meses" semPadding>
          {Object.keys(porMes).length ? (
            <div className="max-h-[420px] overflow-y-auto">
              {Object.entries(porMes).map(([mes, evs]) => (
                <div key={mes} className="border-b border-gray-50 px-4 py-3 last:border-0">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{fmtMesLongo(mes)}</p>
                  <ul className="space-y-1">
                    {evs.map((e, i) => (
                      <li key={`${e.tarefa.id}-${i}`} className="flex gap-3 text-sm">
                        <span className="w-10 shrink-0 font-semibold tabular-nums text-gray-500">{e.data.slice(8, 10)}</span>
                        <span className="min-w-0 truncate text-gray-800">{nomeTarefa(dados, e.tarefa)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <Vazio>Defina as datas das manutenções para ver a agenda.</Vazio>
          )}
        </Secao>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Secao titulo="Gastos com manutenção" extra={<span className="text-xs text-gray-400">últimos 12 meses</span>}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafico}>
                <CartesianGrid vertical={false} stroke="#eef1f4" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} tickFormatter={(v: number) => `R$ ${Math.round(Number(v))}`} />
                <Tooltip formatter={(v) => fmtMoeda(Number(v))} />
                <Bar dataKey="gasto" name="Gasto" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Secao>
        <Secao titulo="Garantias vencendo (90 dias)" extra={<Link href="/casa/itens" className="text-xs font-semibold text-brand-600">Itens</Link>}>
          {garantias.length ? (
            <ul className="space-y-2 text-sm">
              {garantias.map((i) => (
                <li key={i.id} className="flex items-center gap-2">
                  <span className="flex-1 truncate font-medium">{i.nome}</span>
                  <span className="text-gray-500">até {fmtData(i.garantia_ate)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Vazio>Nenhuma garantia vencendo nos próximos 90 dias.</Vazio>
          )}
        </Secao>
      </div>
    </div>
  );
}

/* ---------- MANUTENÇÕES ---------- */
export function ManutencoesCasa() {
  const { dados, abrir } = useCasa();
  const params = useSearchParams();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<'' | StatusTarefa>((params.get('status') as StatusTarefa) || '');
  const [categoria, setCategoria] = useState('');
  const q = busca.toLowerCase();
  const cats = [...new Set(dados.tarefas.map((t) => categoriaTarefa(dados, t)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const lista = dados.tarefas
    .filter((t) => (!q || nomeTarefa(dados, t).toLowerCase().includes(q)) && (!status || statusTarefa(t) === status) && (!categoria || categoriaTarefa(dados, t) === categoria))
    .sort(ordemTarefas);
  return (
    <div>
      <Cabecalho titulo="Manutenções" descricao="O que precisa ser feito, de quanto em quanto tempo e quando é a próxima">
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
      </div>
      <Secao semPadding>
        <TabelaTarefas tarefas={lista} />
      </Secao>
      <p className="mt-3 text-xs text-gray-400">
        Clique em <b>Feito</b> quando realizar uma manutenção: ela vai para o histórico e a próxima data é calculada pela frequência.
      </p>
    </div>
  );
}

/* ---------- ITENS ---------- */
export function ItensCasa() {
  const { dados, abrir, gravar, confirmar, avisar } = useCasa();

  async function excluir(i: CasaItem) {
    const n = dados.tarefas.filter((t) => t.item_id === i.id).length;
    const ok = await confirmar({
      titulo: 'Excluir item',
      perigo: true,
      ok: 'Excluir',
      mensagem: (
        <>
          Excluir <b>{i.nome}</b>?{n > 0 && <p className="mt-2">As {n} manutenção(ões) deste item e o histórico delas também serão apagados.</p>}
        </>
      ),
    });
    if (!ok) return;
    try {
      await gravar('casa_itens', 'delete', undefined, i.id);
      avisar('Item excluído.');
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }

  return (
    <div>
      <Cabecalho titulo="Itens e equipamentos" descricao="Aparelhos e partes da casa que precisam de manutenção, com garantia">
        <button type="button" className="btn-primary" onClick={() => abrir({ tipo: 'item' })}>
          <IconPlus className="h-4 w-4" /> Novo item
        </button>
      </Cabecalho>
      {dados.itens.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...dados.itens]
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
            .map((i) => {
              const tarefas = dados.tarefas.filter((t) => t.item_id === i.id).sort(ordemTarefas);
              const g = statusGarantia(i);
              return (
                <Secao key={i.id}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-semibold text-gray-900">{i.nome}</h4>
                      <p className="text-xs text-gray-500">
                        {i.categoria}
                        {i.comodo ? ` · ${i.comodo}` : ''}
                        {i.marca || i.modelo ? ` · ${[i.marca, i.modelo].filter(Boolean).join(' ')}` : ''}
                      </p>
                    </div>
                    <BotaoIcone titulo="Editar" onClick={() => abrir({ tipo: 'item', id: i.id })}>
                      <IconEdit className="h-4 w-4" />
                    </BotaoIcone>
                    <BotaoIcone titulo="Excluir" perigo onClick={() => excluir(i)}>
                      <IconTrash className="h-4 w-4" />
                    </BotaoIcone>
                  </div>
                  <div className="my-2 flex flex-wrap gap-1.5">
                    <Badge tom={TOM_GARANTIA[g]}>{g === 'none' ? STATUS_GARANTIA.none : `${STATUS_GARANTIA[g]}${i.garantia_ate ? ` · ${fmtData(i.garantia_ate)}` : ''}`}</Badge>
                    {i.data_instalacao && (
                      <Badge tom="cinza" ponto={false}>
                        Instalado em {fmtData(i.data_instalacao)}
                      </Badge>
                    )}
                  </div>
                  {tarefas.length ? (
                    <ul className="space-y-1.5 text-sm">
                      {tarefas.map((t) => (
                        <li key={t.id} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                          <span className="whitespace-nowrap text-xs text-gray-500">{fmtData(t.proxima_data)}</span>
                          <StatusBadge t={t} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">Nenhuma manutenção para este item.</p>
                  )}
                  {i.obs && <p className="mt-2 text-xs text-gray-500">{i.obs}</p>}
                  <button type="button" className="btn-secondary mt-3 !px-3 !py-1 text-xs" onClick={() => abrir({ tipo: 'tarefa', itemId: i.id })}>
                    <IconPlus className="h-3.5 w-3.5" /> Manutenção para este item
                  </button>
                </Secao>
              );
            })}
        </div>
      ) : (
        <Secao>
          <Vazio>Nenhum item cadastrado.</Vazio>
        </Secao>
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
