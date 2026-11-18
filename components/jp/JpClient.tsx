'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { IconCheck, IconEdit, IconEnviado, IconJp, IconPlanilha, IconPlus, IconSearch, IconTrash, IconWhatsApp } from '@/components/icons';
import { createBrowserSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { RESPOSTAS, agruparConvites, formatarTelefone, lerPlanilhaColada, linkWhatsApp, resumoJp, type LinhaImportada } from '@/lib/jp';
import type { JpConvidado, RespostaJp } from '@/types/database';

type FiltroResposta = RespostaJp | 'todos';
type FiltroEnviado = 'sim' | 'nao' | 'todos';

const COR_RESPOSTA: Record<RespostaJp, { ativo: string; ponto: string; barra: string }> = {
  sim: { ativo: 'bg-emerald-600 text-white', ponto: 'bg-emerald-500', barra: 'bg-emerald-500' },
  nao: { ativo: 'bg-red-500 text-white', ponto: 'bg-red-500', barra: 'bg-red-400' },
  pendente: { ativo: 'bg-amber-400 text-gray-900', ponto: 'bg-amber-400', barra: 'bg-amber-300' },
};

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/* ------------------------------------------------------------------ */
export function JpClient({ inicial, filtroResposta, filtroEnviado }: { inicial: JpConvidado[]; filtroResposta: FiltroResposta; filtroEnviado: FiltroEnviado }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [lista, setLista] = useState<JpConvidado[]>(inicial);
  const [busca, setBusca] = useState('');
  const [fResposta, setFResposta] = useState<FiltroResposta>(filtroResposta);
  const [fEnviado, setFEnviado] = useState<FiltroEnviado>(filtroEnviado);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState<JpConvidado | 'novo' | null>(null);
  const [conviteNovo, setConviteNovo] = useState('');
  const [importando, setImportando] = useState(false);

  const resumo = resumoJp(lista);
  const nomesConvites = useMemo(() => agruparConvites(lista).map((g) => g.convite), [lista]);

  const grupos = useMemo(() => {
    const q = normalizar(busca.trim());
    return agruparConvites(lista)
      .map((g) => ({
        ...g,
        visiveis: g.pessoas.filter(
          (p) =>
            (fResposta === 'todos' || p.resposta === fResposta) &&
            (fEnviado === 'todos' || p.enviado === (fEnviado === 'sim')) &&
            (!q || normalizar(`${g.convite} ${p.nome} ${p.telefone ?? ''}`).includes(q))
        ),
      }))
      .filter((g) => g.visiveis.length > 0);
  }, [lista, busca, fResposta, fEnviado]);

  async function atualizar(ids: string[], patch: Partial<Pick<JpConvidado, 'enviado' | 'resposta'>>) {
    const antes = lista;
    setLista((l) => l.map((c) => (ids.includes(c.id) ? { ...c, ...patch } : c)));
    const { error } = await supabase.from('jp_convidados').update(patch).in('id', ids);
    if (error) {
      setLista(antes);
      setErro(`Não foi possível salvar: ${error.message}`);
    }
  }

  async function excluir(c: JpConvidado) {
    if (!window.confirm(`Excluir ${c.nome} da lista?`)) return;
    const { error } = await supabase.from('jp_convidados').delete().eq('id', c.id);
    if (error) return setErro(`Não foi possível excluir: ${error.message}`);
    setLista((l) => l.filter((x) => x.id !== c.id));
  }

  const pct = (n: number) => (resumo.pessoas ? (n / resumo.pessoas) * 100 : 0);

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-5">
      {/* Cabeçalho */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-rose-500 to-pink-400 px-6 py-6 text-white shadow-elevated sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25">
              <IconJp className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">JP</h1>
              <p className="text-sm text-white/85">
                {resumo.pessoas} convidados em {resumo.convites} convites
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 lg:min-w-[640px] xl:min-w-[900px]">
            {[
              { rotulo: 'Convites enviados', valor: resumo.convitesEnviados, sub: `de ${resumo.convites} famílias` },
              { rotulo: 'Faltam enviar', valor: resumo.convitesNaoEnviados, sub: `${resumo.naoEnviados} ${resumo.naoEnviados === 1 ? 'pessoa' : 'pessoas'}` },
              { rotulo: 'Vão comparecer', valor: resumo.sim, sub: 'pessoas confirmadas' },
              { rotulo: 'Não vão', valor: resumo.nao, sub: `${resumo.pendente} sem resposta` },
              { rotulo: 'Famílias que vão', valor: resumo.familiasVao, sub: `${resumo.familiasSemResposta} sem resposta`, destaque: true },
              { rotulo: 'Brindes', valor: resumo.familiasVao, sub: '1 por família', destaque: true },
            ].map((x) => (
              <div key={x.rotulo} className={cn('rounded-2xl px-3 py-2.5 ring-1 ring-inset', x.destaque ? 'bg-white/25 ring-white/30' : 'bg-white/10 ring-white/15')}>
                <dt className="truncate text-[11px] font-medium text-white/80">{x.rotulo}</dt>
                <dd className="text-xl font-bold tabular-nums">{x.valor}</dd>
                <dd className="truncate text-[11px] text-white/70">{x.sub}</dd>
              </div>
            ))}
          </dl>
        </div>
        {resumo.pessoas > 0 && (
          <div className="relative mt-5 flex h-2.5 overflow-hidden rounded-full bg-white/20" title="Sim · Não · Pendente">
            <span className="h-full bg-emerald-300" style={{ width: `${pct(resumo.sim)}%` }} />
            <span className="h-full bg-red-300" style={{ width: `${pct(resumo.nao)}%` }} />
            <span className="h-full bg-amber-200" style={{ width: `${pct(resumo.pendente)}%` }} />
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
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9" placeholder="Buscar convidado, convite ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
            {([{ id: 'todos', rotulo: 'Todos' }, ...RESPOSTAS] as { id: FiltroResposta; rotulo: string }[]).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setFResposta(r.id)}
                className={cn('rounded-lg px-3 py-1.5 transition-colors', fResposta === r.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800')}
              >
                {r.rotulo}
                {r.id !== 'todos' && <span className="ml-1 tabular-nums text-gray-400">{resumo[r.id]}</span>}
              </button>
            ))}
          </div>
          <select className="input-field w-auto py-2 text-xs" value={fEnviado} onChange={(e) => setFEnviado(e.target.value as FiltroEnviado)} aria-label="Convite enviado">
            <option value="todos">Convite: todos</option>
            <option value="sim">Convite enviado</option>
            <option value="nao">Convite não enviado ({resumo.naoEnviados})</option>
          </select>
          <button type="button" className="btn-secondary" onClick={() => setImportando(true)}>
            <IconPlanilha className="h-4 w-4" /> Importar planilha
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setConviteNovo('');
              setEditando('novo');
            }}
          >
            <IconPlus className="h-4 w-4" /> Convidado
          </button>
        </div>
      </section>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-base font-semibold text-gray-900">A lista está vazia</p>
          <p className="mt-1 text-sm text-gray-500">Importe a planilha do Excel ou adicione os convidados um a um.</p>
          <button type="button" className="btn-primary mt-4" onClick={() => setImportando(true)}>
            <IconPlanilha className="h-4 w-4" /> Importar planilha
          </button>
        </div>
      ) : grupos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">Nenhum convidado com esses filtros.</p>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {grupos.map((g) => {
            const tel = g.pessoas.find((p) => p.telefone)?.telefone ?? null;
            const wa = linkWhatsApp(tel);
            const todosEnviados = g.pessoas.every((p) => p.enviado);
            const ids = g.pessoas.map((p) => p.id);
            const confirmados = g.pessoas.filter((p) => p.resposta === 'sim').length;
            return (
              <article key={g.convite} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
                <header className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{g.convite}</h3>
                    <p className="truncate text-xs text-gray-500">
                      {g.pessoas.length} {g.pessoas.length === 1 ? 'pessoa' : 'pessoas'} · {confirmados} confirmada(s)
                      {tel ? ` · ${tel}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => atualizar(ids, { enviado: !todosEnviados })}
                    title={todosEnviados ? 'Convite enviado (clique para desfazer)' : 'Marcar convite como enviado'}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                      todosEnviados ? 'bg-sky-50 text-sky-700 hover:bg-sky-100' : 'bg-white text-gray-500 ring-1 ring-inset ring-gray-200 hover:text-gray-800'
                    )}
                  >
                    {todosEnviados ? <IconCheck className="h-3.5 w-3.5" /> : <IconEnviado className="h-3.5 w-3.5" />}
                    {todosEnviados ? 'Enviado' : 'Enviar'}
                  </button>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir no WhatsApp"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
                    >
                      <IconWhatsApp className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    title="Adicionar pessoa neste convite"
                    onClick={() => {
                      setConviteNovo(g.convite);
                      setEditando('novo');
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    <IconPlus className="h-4 w-4" />
                  </button>
                </header>
                <ul className="divide-y divide-gray-50">
                  {g.visiveis.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 px-4 py-2.5">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', COR_RESPOSTA[p.resposta].ponto)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{p.nome}</p>
                        <p className="truncate text-[11px] text-gray-400">
                          {p.enviado ? 'Convite enviado' : 'Convite não enviado'}
                          {p.telefone && p.telefone !== tel ? ` · ${p.telefone}` : ''}
                          {p.obs ? ` · ${p.obs}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 rounded-lg bg-gray-100 p-0.5 text-[11px] font-semibold">
                        {RESPOSTAS.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => p.resposta !== r.id && atualizar([p.id], { resposta: r.id })}
                            className={cn('rounded-md px-2 py-1 transition-colors', p.resposta === r.id ? COR_RESPOSTA[r.id].ativo : 'text-gray-500 hover:text-gray-800')}
                          >
                            {r.id === 'pendente' ? '?' : r.rotulo}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => setEditando(p)} className="rounded-lg p-1.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600" aria-label="Editar">
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => excluir(p)} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-negative" aria-label="Excluir">
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      )}

      {editando && (
        <ConvidadoModal
          convidado={editando === 'novo' ? null : editando}
          conviteInicial={conviteNovo}
          convites={nomesConvites}
          proximaOrdem={lista.reduce((m, c) => Math.max(m, c.ordem), 0) + 1}
          onFechar={() => setEditando(null)}
          onSalvo={(c) => {
            setLista((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [...l, c]));
            setEditando(null);
          }}
        />
      )}

      {importando && (
        <ImportarModal
          temLista={lista.length > 0}
          onFechar={() => setImportando(false)}
          onImportado={(nova) => {
            setLista(nova);
            setImportando(false);
          }}
          ordemInicial={lista.reduce((m, c) => Math.max(m, c.ordem), 0) + 1}
          listaAtual={lista}
        />
      )}
    </div>
  );
}

/* ---------------------------- adicionar / editar ---------------------------- */
function ConvidadoModal({
  convidado,
  conviteInicial,
  convites,
  proximaOrdem,
  onFechar,
  onSalvo,
}: {
  convidado: JpConvidado | null;
  conviteInicial: string;
  convites: string[];
  proximaOrdem: number;
  onFechar: () => void;
  onSalvo: (c: JpConvidado) => void;
}) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [nome, setNome] = useState(convidado?.nome ?? '');
  const [convite, setConvite] = useState(convidado?.convite ?? conviteInicial);
  const [telefone, setTelefone] = useState(convidado?.telefone ?? '');
  const [enviado, setEnviado] = useState(convidado?.enviado ?? false);
  const [resposta, setResposta] = useState<RespostaJp>(convidado?.resposta ?? 'pendente');
  const [obs, setObs] = useState(convidado?.obs ?? '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro('Informe o nome do convidado.');
    setSalvando(true);
    setErro('');
    const dados = {
      nome: nome.trim(),
      convite: convite.trim() || nome.trim(),
      telefone: formatarTelefone(telefone),
      enviado,
      resposta,
      obs: obs.trim() || null,
    };
    const { data, error } = convidado
      ? await supabase.from('jp_convidados').update(dados).eq('id', convidado.id).select().single()
      : await supabase.from('jp_convidados').insert({ ...dados, ordem: proximaOrdem }).select().single();
    setSalvando(false);
    if (error || !data) return setErro(`Não foi possível salvar: ${error?.message ?? 'erro desconhecido'}`);
    onSalvo(data as JpConvidado);
  }

  return (
    <Modal open onClose={onFechar} title={convidado ? 'Editar convidado' : 'Novo convidado'}>
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className="label-field">Nome do convidado</label>
          <input className="input-field" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-field">Convite (família / grupo)</label>
            <input className="input-field" list="jp-convites" value={convite} onChange={(e) => setConvite(e.target.value)} placeholder="Ex.: Poliana e família" />
            <datalist id="jp-convites">
              {convites.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label-field">Telefone</label>
            <input className="input-field" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" inputMode="tel" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={enviado} onChange={(e) => setEnviado(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          Convite já enviado
        </label>
        <div>
          <label className="label-field">Vai comparecer?</label>
          <div className="flex gap-2">
            {RESPOSTAS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setResposta(r.id)}
                className={cn('flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors', resposta === r.id ? COR_RESPOSTA[r.id].ativo : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
              >
                {r.rotulo}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label-field">Observação</label>
          <input className="input-field" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
        </div>
        {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-negative">{erro}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button type="button" className="btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------- importar do Excel ---------------------------- */
function ImportarModal({
  temLista,
  listaAtual,
  ordemInicial,
  onFechar,
  onImportado,
}: {
  temLista: boolean;
  listaAtual: JpConvidado[];
  ordemInicial: number;
  onFechar: () => void;
  onImportado: (lista: JpConvidado[]) => void;
}) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [texto, setTexto] = useState('');
  const [substituir, setSubstituir] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const linhas: LinhaImportada[] = useMemo(() => lerPlanilhaColada(texto), [texto]);
  const previa = resumoJp(linhas);

  async function importar() {
    if (!linhas.length) return setErro('Cole as linhas da planilha primeiro.');
    if (temLista && substituir && !window.confirm(`Apagar os ${listaAtual.length} convidados atuais e importar ${linhas.length}?`)) return;
    setSalvando(true);
    setErro('');
    if (temLista && substituir) {
      const { error } = await supabase.from('jp_convidados').delete().in('id', listaAtual.map((c) => c.id));
      if (error) {
        setSalvando(false);
        return setErro(`Não foi possível limpar a lista atual: ${error.message}`);
      }
    }
    const base = temLista && !substituir ? ordemInicial : 1;
    const { data, error } = await supabase
      .from('jp_convidados')
      .insert(linhas.map((l, i) => ({ ...l, ordem: base + i })))
      .select();
    setSalvando(false);
    if (error) return setErro(`Não foi possível importar: ${error.message}`);
    const novos = (data ?? []) as JpConvidado[];
    onImportado(temLista && !substituir ? [...listaAtual, ...novos] : novos);
  }

  return (
    <Modal open onClose={onFechar} title="Importar planilha" wide>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          No Excel, selecione as colunas <b>A a E</b> (Nome do convite, Telefone, Nome dos convidados, Convite, Situação), copie com <b>Ctrl+C</b> e cole abaixo.
          Linhas sem nome do convite entram no convite da linha de cima.
        </p>
        <textarea
          className="input-field h-48 font-mono text-xs"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={'Poliana e familia\t11984432868\tPoliana Queiroz\tSim\tSim\n\t11914898051\tMaria Pessoa\tSim\tPendente'}
          autoFocus
        />
        {linhas.length > 0 && (
          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <b>{previa.pessoas}</b> convidados em <b>{previa.convites}</b> convites · {previa.enviados} com convite enviado ·{' '}
            <span className="text-emerald-700">{previa.sim} sim</span> · <span className="text-red-600">{previa.nao} não</span> ·{' '}
            <span className="text-amber-700">{previa.pendente} pendentes</span>
          </div>
        )}
        {temLista && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <label className="flex items-center gap-2">
              <input type="radio" checked={substituir} onChange={() => setSubstituir(true)} /> Substituir a lista atual
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!substituir} onChange={() => setSubstituir(false)} /> Adicionar à lista atual
            </label>
          </div>
        )}
        {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-negative">{erro}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button type="button" className="btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" disabled={salvando || !linhas.length} onClick={importar}>
            {salvando ? 'Importando…' : `Importar ${linhas.length || ''}`.trim()}
          </button>
        </div>
      </div>
    </Modal>
  );
}
