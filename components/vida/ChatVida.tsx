'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { carregarMensagens, excluirConversa, renomearConversa } from '@/app/(dashboard)/vida/actions';
import { TextoFormatado } from '@/components/vida/TextoFormatado';
import { PropostaPlanoCard } from '@/components/vida/PropostaPlanoCard';
import { extrairPlanos } from '@/lib/vida/planos';
import { PILARES, pilarPorNumero } from '@/lib/vida/pilares';
import { cn } from '@/lib/utils';

type Conversa = { id: string; titulo: string; pilar: number | null; atualizado_em: string };
type Msg = { id: string; papel: 'user' | 'assistant'; conteudo: string; pendente?: boolean };

const SUGESTOES_INICIO = [
  { emoji: '🩺', texto: 'Vamos começar o diagnóstico da minha vida. Me faça a primeira pergunta.' },
  { emoji: '🎯', texto: 'Quais deveriam ser minhas 5 prioridades agora? Me pergunte o que precisar.' },
  { emoji: '🗓️', texto: 'Me ajude a montar uma semana equilibrada e sustentável.' },
  { emoji: '🧾', texto: 'Quero um plano para sair das dívidas. Use os números do app e me diga por onde começar.' },
  { emoji: '😮‍💨', texto: 'Estou sobrecarregado hoje. Quero conversar sobre isso.' },
];

function quando(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === ontem.toDateString()) return 'ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function ChatVida({
  conversas: conversasIniciais,
  conversaInicial,
  mensagensIniciais,
  chaveOk,
  pilarInicial,
  textoInicial,
}: {
  conversas: Conversa[];
  conversaInicial: string | null;
  mensagensIniciais: Msg[];
  chaveOk: boolean;
  pilarInicial: number | null;
  textoInicial?: string;
}) {
  const [conversas, setConversas] = useState(conversasIniciais);
  const [ativa, setAtiva] = useState<string | null>(conversaInicial);
  const [mensagens, setMensagens] = useState<Msg[]>(mensagensIniciais);
  const [pilarNova, setPilarNova] = useState<number | null>(pilarInicial);
  const [texto, setTexto] = useState(textoInicial ?? '');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [listaAberta, setListaAberta] = useState(!conversaInicial);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  const conversaAtual = conversas.find((c) => c.id === ativa) ?? null;
  const pilarAtual = pilarPorNumero(conversaAtual?.pilar ?? pilarNova);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens]);

  useEffect(() => {
    const el = campoRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [texto]);

  async function abrir(id: string) {
    if (enviando) return;
    setAtiva(id);
    setErro(null);
    setListaAberta(false);
    setCarregando(true);
    window.history.replaceState(null, '', `/vida/conversas?c=${id}`);
    const r = await carregarMensagens(id);
    setCarregando(false);
    if (r.error) setErro(r.error);
    else setMensagens((r.mensagens ?? []) as Msg[]);
  }

  function nova(pilar: number | null = null) {
    if (enviando) return;
    setAtiva(null);
    setMensagens([]);
    setPilarNova(pilar);
    setErro(null);
    setListaAberta(false);
    window.history.replaceState(null, '', pilar ? `/vida/conversas?pilar=${pilar}` : '/vida/conversas');
    setTimeout(() => campoRef.current?.focus(), 50);
  }

  async function enviar(conteudo?: string) {
    const msg = (conteudo ?? texto).trim();
    if (!msg || enviando) return;
    setTexto('');
    setErro(null);
    setEnviando(true);
    const idTemp = `tmp-${Date.now()}`;
    setMensagens((m) => [...m, { id: `${idTemp}-u`, papel: 'user', conteudo: msg }, { id: `${idTemp}-a`, papel: 'assistant', conteudo: '', pendente: true }]);

    try {
      const resp = await fetch('/api/vida/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversaId: ativa, mensagem: msg, pilar: ativa ? undefined : pilarNova }),
      });
      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({}));
        throw Object.assign(new Error(j.error ?? 'Não foi possível falar com o mentor.'), { conversaId: j.conversaId as string | undefined });
      }
      const idConv = resp.headers.get('x-conversa-id');
      if (idConv && idConv !== ativa) {
        setAtiva(idConv);
        setConversas((cs) => [{ id: idConv, titulo: msg.slice(0, 70) + (msg.length > 70 ? '…' : ''), pilar: pilarNova, atualizado_em: new Date().toISOString() }, ...cs]);
        window.history.replaceState(null, '', `/vida/conversas?c=${idConv}`);
      }
      const leitor = resp.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        const pedaco = dec.decode(value, { stream: true });
        setMensagens((m) => m.map((x) => (x.id === `${idTemp}-a` ? { ...x, conteudo: x.conteudo + pedaco } : x)));
      }
      setMensagens((m) => m.map((x) => (x.id === `${idTemp}-a` ? { ...x, pendente: false } : x)));
      if (idConv) setConversas((cs) => cs.map((c) => (c.id === idConv ? { ...c, atualizado_em: new Date().toISOString() } : c)).sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar.');
      setMensagens((m) => m.filter((x) => x.id !== `${idTemp}-a`));
      const idConv = (e as { conversaId?: string }).conversaId;
      if (idConv && !ativa) {
        setAtiva(idConv);
        setConversas((cs) => (cs.some((c) => c.id === idConv) ? cs : [{ id: idConv, titulo: msg.slice(0, 70), pilar: pilarNova, atualizado_em: new Date().toISOString() }, ...cs]));
      }
    } finally {
      setEnviando(false);
      setTimeout(() => campoRef.current?.focus(), 50);
    }
  }

  async function renomear() {
    if (!conversaAtual) return;
    const t = window.prompt('Nome da conversa', conversaAtual.titulo);
    if (!t || t.trim() === conversaAtual.titulo) return;
    const r = await renomearConversa(conversaAtual.id, t);
    if (r.error) setErro(r.error);
    else setConversas((cs) => cs.map((c) => (c.id === conversaAtual.id ? { ...c, titulo: t.trim() } : c)));
  }

  async function excluir() {
    if (!conversaAtual) return;
    if (!window.confirm(`Excluir a conversa “${conversaAtual.titulo}”? As mensagens serão apagadas e não dá para desfazer.`)) return;
    const r = await excluirConversa(conversaAtual.id);
    if (r.error) return setErro(r.error);
    setConversas((cs) => cs.filter((c) => c.id !== conversaAtual.id));
    nova();
  }

  return (
    <div className="grid h-[calc(100dvh-150px)] min-h-[520px] gap-4 lg:grid-cols-[290px_1fr]">
      {/* lista de conversas */}
      <aside className={cn('card flex min-h-0 flex-col overflow-hidden p-0', !listaAberta && 'hidden lg:flex')}>
        <div className="border-b border-gray-100 p-3">
          <button type="button" onClick={() => nova()} className="btn-primary w-full justify-center">
            + Nova conversa
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversas.length === 0 && <li className="px-3 py-6 text-center text-xs text-gray-400">Nenhuma conversa ainda.</li>}
          {conversas.map((c) => {
            const p = pilarPorNumero(c.pilar);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => abrir(c.id)}
                  className={cn('flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition', c.id === ativa ? 'bg-brand-50' : 'hover:bg-gray-50')}
                >
                  <span className="mt-0.5 text-base">{p?.emoji ?? '💬'}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm', c.id === ativa ? 'font-semibold text-brand-800' : 'text-gray-800')}>{c.titulo}</span>
                    <span className="block truncate text-[11px] text-gray-400">
                      {p ? `${p.curto} · ` : ''}
                      {quando(c.atualizado_em)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* conversa */}
      <section className={cn('card flex min-h-0 flex-col overflow-hidden p-0', listaAberta && 'hidden lg:flex')}>
        <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
          <button type="button" onClick={() => setListaAberta(true)} className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 lg:hidden" aria-label="Ver conversas">
            ←
          </button>
          <span className="text-xl">{pilarAtual?.emoji ?? '🧭'}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{conversaAtual?.titulo ?? 'Nova conversa'}</p>
            {conversaAtual || pilarNova ? (
              <p className="truncate text-[11px] text-gray-400">{pilarAtual ? pilarAtual.nome : 'Assunto livre'}</p>
            ) : (
              <select
                value={pilarNova ?? ''}
                onChange={(e) => setPilarNova(e.target.value ? Number(e.target.value) : null)}
                className="mt-0.5 rounded-md border-0 bg-transparent p-0 text-[11px] text-gray-500 focus:ring-0"
                aria-label="Pilar da conversa"
              >
                <option value="">Assunto livre (ou escolha um pilar)</option>
                {PILARES.map((p) => (
                  <option key={p.n} value={p.n}>
                    {p.emoji} {p.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
          {conversaAtual && (
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={renomear} className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">
                Renomear
              </button>
              <button type="button" onClick={excluir} className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50">
                Excluir
              </button>
            </div>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {carregando ? (
            <p className="py-10 text-center text-sm text-gray-400">Carregando conversa...</p>
          ) : mensagens.length === 0 ? (
            <div className="mx-auto flex max-w-xl flex-col items-center py-6 text-center">
              <span className="anim-pop text-5xl">{pilarAtual?.emoji ?? '🧭'}</span>
              <p className="mt-3 text-lg font-semibold text-gray-900">{pilarAtual ? `Vamos falar de ${pilarAtual.nome.toLowerCase()}` : 'Sobre o que vamos conversar?'}</p>
              <p className="mt-1 text-sm text-gray-500">
                O mentor segue as suas instruções: direto, honesto e uma pergunta por vez. Tudo aqui é privado — só você vê.
              </p>
              {!pilarAtual && (
                <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
                  {SUGESTOES_INICIO.map((s) => (
                    <button
                      key={s.texto}
                      type="button"
                      onClick={() => enviar(s.texto)}
                      disabled={!chaveOk || enviando}
                      className="rounded-2xl border border-gray-100 bg-white px-3.5 py-3 text-left text-sm text-gray-700 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card disabled:opacity-50"
                    >
                      <span className="mr-1.5">{s.emoji}</span>
                      {s.texto}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {mensagens.map((m) =>
                m.papel === 'user' ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white shadow-soft">{m.conteudo}</div>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-3">
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-base">🧭</span>
                    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-gray-50 px-4 py-3">
                      {m.conteudo ? (
                        <div className="space-y-3">
                          {extrairPlanos(m.conteudo).map((parte, k) =>
                            parte.tipo === 'texto' ? (
                              parte.conteudo.trim() ? <TextoFormatado key={k} texto={parte.conteudo} /> : null
                            ) : parte.tipo === 'plano' ? (
                              <PropostaPlanoCard key={k} plano={parte.plano} />
                            ) : (
                              <p key={k} className="animate-pulse rounded-xl bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">🗂️ Montando o plano...</p>
                            )
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex gap-1 py-1" aria-label="Pensando">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.3s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.15s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300" />
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
              <div ref={fimRef} />
            </div>
          )}
        </div>

        <footer className="border-t border-gray-100 p-3">
          {!chaveOk ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              ⚙️ A IA ainda não foi configurada. Veja o passo a passo em{' '}
              <Link href="/vida/ajustes" className="font-semibold underline">
                Ajustes do Mentor
              </Link>
              .
            </p>
          ) : (
            <>
              {erro && <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  enviar();
                }}
              >
                <textarea
                  ref={campoRef}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      enviar();
                    }
                  }}
                  rows={1}
                  placeholder={enviando ? 'O mentor está respondendo...' : 'Escreva aqui… (Enter envia, Shift+Enter quebra linha)'}
                  className="input-field max-h-[200px] min-h-[44px] flex-1 resize-none py-2.5"
                  disabled={enviando}
                />
                <button type="submit" disabled={enviando || !texto.trim()} className="btn-primary h-11 shrink-0 px-4">
                  {enviando ? '…' : 'Enviar'}
                </button>
              </form>
              <p className="mt-1.5 text-center text-[10px] text-gray-400">
                O mentor é uma IA e pode errar. Não substitui psicólogo, médico ou outros profissionais. Em crise, ligue 188 (CVV).
              </p>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
