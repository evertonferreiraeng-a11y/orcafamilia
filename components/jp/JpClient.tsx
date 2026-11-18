'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { IconCheck, IconCompartilhar, IconCopiar, IconEdit, IconEnviado, IconPlanilha, IconPlus, IconSearch, IconTrash, IconWhatsApp } from '@/components/icons';
import { ResumoJpTopo } from '@/components/jp/ResumoJpTopo';
import { MolduraJp } from '@/components/jp/Decoracao';
import { fonteSerif } from '@/lib/jpFontes';
import { createBrowserSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { RESPOSTAS, agruparConvites, lerPlanilhaColada, resumoJp, type LinhaImportada } from '@/lib/jp';
import type { JpConvidado, RespostaJp } from '@/types/database';

type FiltroResposta = RespostaJp | 'todos';
type FiltroEnviado = 'sim' | 'nao' | 'todos';

const COR_RESPOSTA: Record<RespostaJp, { ativo: string; ponto: string }> = {
  sim: { ativo: 'bg-[#3f6aa6] text-white shadow-sm', ponto: 'bg-[#3f6aa6]' },
  nao: { ativo: 'bg-[#c58f8f] text-white shadow-sm', ponto: 'bg-[#c9a3a3]' },
  pendente: { ativo: 'bg-[#e3c47c] text-[#5a4410] shadow-sm', ponto: 'bg-[#e3c47c]' },
};
const BTN_AZUL = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#3f6aa6] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#335a92] disabled:opacity-50';
const BTN_CLARO = 'inline-flex items-center justify-center gap-2 rounded-full border border-[#cfdcee] bg-white px-4 py-2 text-sm font-medium text-[#3f6aa6] transition-colors hover:bg-[#f1f5fb]';
const INPUT_JP = 'w-full rounded-full border border-[#d5e0ee] bg-white/90 px-4 py-2 text-sm text-[#2f5288] placeholder:text-[#9db0cb] focus:border-[#3f6aa6] focus:outline-none focus:ring-1 focus:ring-[#3f6aa6]';

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
  const [compartilhando, setCompartilhando] = useState(false);

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
            (!q || normalizar(`${g.convite} ${p.nome}`).includes(q))
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

  return (
    <MolduraJp className={cn('mx-auto w-full max-w-[1800px] rounded-[32px] px-3 py-4 sm:px-6 sm:py-6', fonteSerif.className)}>
    <div className="space-y-5">
      <ResumoJpTopo
        resumo={resumo}
        acao={
          <button type="button" onClick={() => setCompartilhando(true)} className={cn(BTN_CLARO, 'px-3 py-1.5 text-xs')}>
            <IconCompartilhar className="h-3.5 w-3.5" /> Link para acompanhar
          </button>
        }
      />

      {erro && (
        <button type="button" onClick={() => setErro('')} className="w-full rounded-xl bg-red-50 px-4 py-2.5 text-left text-sm font-medium text-negative">
          {erro} <span className="text-xs text-red-400">(fechar)</span>
        </button>
      )}

      {/* Filtros e ações */}
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9db0cb]" />
          <input className={cn(INPUT_JP, 'pl-10')} placeholder="Buscar convidado ou convite" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-[#d5e0ee] bg-white/90 p-1 text-xs font-semibold">
            {([{ id: 'todos', rotulo: 'Todos' }, ...RESPOSTAS] as { id: FiltroResposta; rotulo: string }[]).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setFResposta(r.id)}
                className={cn('rounded-full px-3 py-1.5 transition-colors', fResposta === r.id ? 'bg-[#3f6aa6] text-white shadow-sm' : 'text-[#5d7aa3] hover:text-[#2f5288]')}
              >
                {r.rotulo}
                {r.id !== 'todos' && <span className="ml-1 tabular-nums opacity-70">{resumo[r.id]}</span>}
              </button>
            ))}
          </div>
          <select className={cn(INPUT_JP, 'w-auto text-xs')} value={fEnviado} onChange={(e) => setFEnviado(e.target.value as FiltroEnviado)} aria-label="Convite enviado">
            <option value="todos">Convite: todos</option>
            <option value="sim">Convite enviado</option>
            <option value="nao">Convite não enviado ({resumo.naoEnviados})</option>
          </select>
          <button type="button" className={BTN_CLARO} onClick={() => setImportando(true)}>
            <IconPlanilha className="h-4 w-4" /> Importar planilha
          </button>
          <button
            type="button"
            className={BTN_AZUL}
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
        <div className="rounded-3xl border border-dashed border-[#cfdcee] bg-white/80 px-6 py-12 text-center">
          <p className="text-base font-semibold text-[#2f5288]">A lista está vazia</p>
          <p className="mt-1 text-sm italic text-[#7c93b5]">Importe a planilha do Excel ou adicione os convidados um a um.</p>
          <button type="button" className={cn(BTN_AZUL, 'mt-4')} onClick={() => setImportando(true)}>
            <IconPlanilha className="h-4 w-4" /> Importar planilha
          </button>
        </div>
      ) : grupos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#cfdcee] bg-white/70 px-4 py-8 text-center text-sm italic text-[#7c93b5]">Nenhum convidado com esses filtros.</p>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {grupos.map((g) => {
            const todosEnviados = g.pessoas.every((p) => p.enviado);
            const ids = g.pessoas.map((p) => p.id);
            const confirmados = g.pessoas.filter((p) => p.resposta === 'sim').length;
            return (
              <article key={g.convite} className="overflow-hidden rounded-3xl border border-[#dfe7f2] bg-white/90 shadow-[0_8px_30px_-22px_rgba(44,79,134,0.5)]">
                <header className="flex items-center gap-3 border-b border-[#e6edf6] bg-gradient-to-b from-[#f5f8fc] to-white px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold italic text-[#2f5288]">{g.convite}</h3>
                    <p className="truncate text-xs text-[#8aa0bf]">
                      {g.pessoas.length} {g.pessoas.length === 1 ? 'pessoa' : 'pessoas'} · {confirmados} confirmada(s)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => atualizar(ids, { enviado: !todosEnviados })}
                    title={todosEnviados ? 'Convite enviado (clique para desfazer)' : 'Marcar convite como enviado'}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                      todosEnviados ? 'bg-[#eaf0f8] text-[#3f6aa6] hover:bg-[#dfe8f4]' : 'bg-[#fbf3df] text-[#8a6a1e] ring-1 ring-inset ring-[#ecd9a8] hover:bg-[#f7ebcb]'
                    )}
                  >
                    {todosEnviados ? <IconCheck className="h-3.5 w-3.5" /> : <IconEnviado className="h-3.5 w-3.5" />}
                    {todosEnviados ? 'Enviado' : 'Enviar'}
                  </button>
                  <button
                    type="button"
                    title="Adicionar pessoa neste convite"
                    onClick={() => {
                      setConviteNovo(g.convite);
                      setEditando('novo');
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9db0cb] transition-colors hover:bg-[#eef3f9] hover:text-[#3f6aa6]"
                  >
                    <IconPlus className="h-4 w-4" />
                  </button>
                </header>
                <ul className="divide-y divide-[#eef2f8]">
                  {g.visiveis.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 px-4 py-2.5">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', COR_RESPOSTA[p.resposta].ponto)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[#2f5288]">{p.nome}</p>
                        <p className="truncate text-[11px] italic text-[#9db0cb]">
                          {p.enviado ? 'Convite enviado' : 'Convite não enviado'}
                          {p.obs ? ` · ${p.obs}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 rounded-full border border-[#e1e9f3] bg-[#f6f9fc] p-0.5 text-[11px] font-semibold">
                        {RESPOSTAS.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => p.resposta !== r.id && atualizar([p.id], { resposta: r.id })}
                            className={cn('rounded-full px-2.5 py-1 transition-colors', p.resposta === r.id ? COR_RESPOSTA[r.id].ativo : 'text-[#8aa0bf] hover:text-[#2f5288]')}
                          >
                            {r.id === 'pendente' ? '?' : r.rotulo}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => setEditando(p)} className="rounded-full p-1.5 text-[#c2cfe1] hover:bg-[#eef3f9] hover:text-[#3f6aa6]" aria-label="Editar">
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => excluir(p)} className="rounded-full p-1.5 text-[#c2cfe1] hover:bg-red-50 hover:text-negative" aria-label="Excluir">
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

      {compartilhando && <CompartilharModal onFechar={() => setCompartilhando(false)} />}

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
    </MolduraJp>
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
        <div>
          <div>
            <label className="label-field">Convite (família / grupo)</label>
            <input className="input-field" list="jp-convites" value={convite} onChange={(e) => setConvite(e.target.value)} placeholder="Ex.: Poliana e família" />
            <datalist id="jp-convites">
              {convites.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
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
                className={cn('flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors', resposta === r.id ? COR_RESPOSTA[r.id].ativo : 'bg-[#f1f5fb] text-[#5d7aa3] hover:bg-[#e6edf6]')}
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
          No Excel, selecione as colunas <b>A a E</b> (Nome do convite, Telefone, Nome dos convidados, Convite, Situação), copie com <b>Ctrl+C</b> e cole abaixo. Os telefones são ignorados.
          Linhas sem nome do convite entram no convite da linha de cima.
        </p>
        <textarea
          className="input-field h-48 font-mono text-xs"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={'Poliana e familia\t\tPoliana Queiroz\tSim\tSim\n\t\tMaria Pessoa\tSim\tPendente'}
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
          <button type="button" className={BTN_CLARO} onClick={onFechar}>
            Cancelar
          </button>
          <button type="button" className={BTN_AZUL} disabled={salvando || !linhas.length} onClick={importar}>
            {salvando ? 'Importando…' : `Importar ${linhas.length || ''}`.trim()}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------- link de acompanhamento ---------------------------- */
const novoToken = () => `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '').slice(0, 40);

function CompartilharModal({ onFechar }: { onFechar: () => void }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [token, setToken] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    supabase
      .from('jp_compartilhamento')
      .select('token')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setErro(error.message.includes('jp_compartilhamento') ? 'Rode a migração supabase/migrations/0029_jp_compartilhar.sql no Supabase para ativar o link.' : error.message);
        setToken(data?.token ?? null);
        setCarregado(true);
      });
  }, [supabase]);

  const url = token ? `${window.location.origin}/convidados/${token}` : '';

  async function gerar(trocar: boolean) {
    if (trocar && !window.confirm('Trocar o link? O link antigo para de funcionar.')) return;
    setOcupado(true);
    setErro('');
    const t = novoToken();
    const { error } = trocar
      ? await supabase.from('jp_compartilhamento').update({ token: t }).neq('token', '')
      : await supabase.from('jp_compartilhamento').insert({ token: t });
    setOcupado(false);
    if (error) return setErro(`Não foi possível gerar o link: ${error.message}`);
    setToken(t);
    setCopiado(false);
  }

  async function desativar() {
    if (!window.confirm('Desativar o link? Quem tiver o link não conseguirá mais abrir a lista.')) return;
    setOcupado(true);
    const { error } = await supabase.from('jp_compartilhamento').delete().neq('token', '');
    setOcupado(false);
    if (error) return setErro(`Não foi possível desativar: ${error.message}`);
    setToken(null);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      setErro('Não deu para copiar automaticamente. Selecione o link e copie.');
    }
  }

  return (
    <Modal open onClose={onFechar} title="Link para acompanhar">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Quem abrir este link vê <b>só o JP</b> (números e lista de convidados), sem login e <b>sem poder alterar nada</b>. Os outros apps do Life não aparecem.
        </p>
        {!carregado ? (
          <p className="text-sm text-gray-400">Carregando…</p>
        ) : token ? (
          <>
            <input className="input-field select-all bg-gray-50 text-xs text-gray-700" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={BTN_AZUL} onClick={copiar}>
                {copiado ? <IconCheck className="h-4 w-4" /> : <IconCopiar className="h-4 w-4" />} {copiado ? 'Copiado' : 'Copiar link'}
              </button>
              <a className={BTN_CLARO} href={`https://wa.me/?text=${encodeURIComponent(`Lista de convidados do JP (só para acompanhar): ${url}`)}`} target="_blank" rel="noreferrer">
                <IconWhatsApp className="h-4 w-4" /> Enviar pelo WhatsApp
              </a>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-3 text-xs">
              <button type="button" className="font-medium text-gray-500 hover:text-gray-800" disabled={ocupado} onClick={() => gerar(true)}>
                Trocar link
              </button>
              <button type="button" className="font-medium text-red-500 hover:text-red-700" disabled={ocupado} onClick={desativar}>
                Desativar link
              </button>
            </div>
          </>
        ) : (
          !erro && (
            <button type="button" className={BTN_AZUL} disabled={ocupado} onClick={() => gerar(false)}>
              <IconCompartilhar className="h-4 w-4" /> {ocupado ? 'Gerando…' : 'Criar link'}
            </button>
          )
        )}
        {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-negative">{erro}</p>}
      </div>
    </Modal>
  );
}
