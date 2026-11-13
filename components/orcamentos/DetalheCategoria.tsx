'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { CategoriaAnual, SubcategoriaAnual } from '@/components/orcamentos/OrcamentosClient';
import {
  CampoValor,
  ChipSugestao,
  arredondar,
  executadoNoMes,
  formatarEntrada,
  mediaTresMeses,
  orcadoMesAnterior,
  parseValor,
  type ItemPlanejado,
} from '@/components/orcamentos/edicaoOrcamento';
import { buscarLancamentosCategoria, type LancamentoCategoria } from '@/app/(dashboard)/orcamentos/actions';
import { Modal } from '@/components/ui/Modal';
import { IconCheck, IconChevronLeft, IconChevronRight, IconDesfazer } from '@/components/icons';
import { resolverValorEfetivo } from '@/lib/orcamentos';
import { emojiCategoria, humorOrcamento } from '@/lib/emojiCategoria';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type Linha = CategoriaAnual | SubcategoriaAnual;

function orcadoEfetivo(c: CategoriaAnual, mes: number): number | null {
  if (mes < 0) return mes === -1 ? c.orcadoDezAnterior ?? null : null;
  const temSub = c.subcategorias.length > 0;
  const soma = c.subcategorias.reduce((a, s) => a + (s.valoresPorMes[mes] ?? 0), 0);
  const v = resolverValorEfetivo(temSub, c.valoresPorMes[mes], soma);
  return v > 0 ? v : null;
}

/** Dias restantes no mês, contando hoje — null se não for o mês corrente. */
function diasRestantes(ano: number, mes: number): number | null {
  const hoje = new Date();
  if (hoje.getFullYear() !== ano || hoje.getMonth() !== mes) return null;
  return new Date(ano, mes + 1, 0).getDate() - hoje.getDate() + 1;
}

function Sugestoes({
  l,
  mes,
  atual,
  definir,
}: {
  l: Linha;
  mes: number;
  atual: number;
  definir: (v: string) => void;
}) {
  const abrev = MESES_ABREV[(mes + 11) % 12].toLowerCase();
  const ant = orcadoMesAnterior(l, mes) ?? 0;
  const med = arredondar(mediaTresMeses(l, mes));
  const real = arredondar(executadoNoMes(l, mes - 1));
  return (
    <div className="flex flex-wrap gap-1">
      <ChipSugestao rotulo={`= ${abrev}`} valor={ant} ativo={atual > 0 && atual === ant} onClick={() => definir(formatarEntrada(ant))} />
      <ChipSugestao rotulo="média 3m" valor={med} ativo={atual > 0 && atual === med} onClick={() => definir(formatarEntrada(med))} />
      {real !== med && <ChipSugestao rotulo={`real ${abrev}`} valor={real} ativo={atual > 0 && atual === real} onClick={() => definir(formatarEntrada(real))} />}
    </div>
  );
}

function BarraProgresso({ exec, orcado, receita, ritmo }: { exec: number; orcado: number; receita?: boolean; ritmo: number | null }) {
  const pct = orcado > 0 ? (exec / orcado) * 100 : 0;
  const estourou = !receita && orcado > 0 && exec > orcado;
  const adiantado = !receita && !estourou && ritmo != null && orcado > 0 && exec > orcado * ritmo * 1.1;
  const cor = orcado <= 0 ? 'bg-gray-300' : receita ? 'bg-emerald-500' : estourou ? 'bg-red-500' : adiantado || pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="relative">
      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div className={cn('h-full rounded-full transition-all duration-700', cor)} style={{ width: `${orcado > 0 ? Math.min(100, pct) : exec > 0 ? 100 : 0}%` }} />
      </div>
      {ritmo != null && orcado > 0 && !receita && (
        <span
          className="absolute -top-1 h-5 w-0.5 rounded-full bg-gray-800/70"
          style={{ left: `calc(${Math.min(100, ritmo * 100)}% - 1px)` }}
          title={`Ritmo ideal até hoje: ${formatCurrency(orcado * ritmo)}`}
        />
      )}
    </div>
  );
}

export function DetalheCategoria({
  categoria: c,
  receita,
  ano,
  mesInicial,
  onFechar,
  onSalvar,
}: {
  categoria: CategoriaAnual;
  receita?: boolean;
  ano: number;
  mesInicial: number;
  onFechar: () => void;
  onSalvar: (itens: ItemPlanejado[], meses: number[]) => Promise<string | undefined>;
}) {
  const [mes, setMes] = useState(mesInicial);
  const temSub = c.subcategorias.length > 0;
  const verbo = receita ? 'Recebido' : 'Gasto';

  /* ---- edição ---- */
  const original = useMemo(() => {
    const m = new Map<string, string>();
    m.set('', formatarEntrada(c.valoresPorMes[mes]));
    for (const s of c.subcategorias) m.set(s.id, formatarEntrada(s.valoresPorMes[mes]));
    return m;
  }, [c, mes]);
  const [rascunho, setRascunho] = useState<Map<string, string>>(original);
  useEffect(() => setRascunho(original), [original]);
  // Meses extras (além do aberto) para onde o valor será replicado ao salvar.
  const [mesesExtras, setMesesExtras] = useState<Set<number>>(new Set());
  useEffect(() => setMesesExtras(new Set()), [mes]);
  function alternarMes(i: number) {
    if (i === mes) return;
    setMensagem(null);
    setMesesExtras((prev) => {
      const novo = new Set(prev);
      if (novo.has(i)) novo.delete(i);
      else novo.add(i);
      return novo;
    });
  }
  function marcarMeses(lista: number[]) {
    setMensagem(null);
    setMesesExtras(new Set(lista.filter((i) => i !== mes)));
  }
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const num = (k: string) => parseValor(rascunho.get(k) ?? '') ?? 0;
  const alteradas = Array.from<string>(rascunho.keys()).filter((k) => (temSub ? k !== '' : k === '') && num(k) !== (parseValor(original.get(k) ?? '') ?? 0));
  const definir = (k: string, v: string) => {
    setMensagem(null);
    setRascunho((prev) => new Map(prev).set(k, v));
  };

  function trocarMes(novo: number) {
    if (novo < 0 || novo > 11) return;
    if (alteradas.length && !window.confirm('Há valores não salvos neste mês. Descartar?')) return;
    setMensagem(null);
    setMes(novo);
  }

  function fechar() {
    if (alteradas.length && !window.confirm('Há valores não salvos. Fechar mesmo assim?')) return;
    onFechar();
  }

  const replicando = mesesExtras.size > 0;
  const podeSalvar = alteradas.length > 0 || replicando;

  async function salvar() {
    if (!podeSalvar) return;
    // Replicando: leva a configuração completa do mês (todas as subcategorias, inclusive zeradas)
    // para que os meses escolhidos fiquem iguais a este. Senão, só o que mudou.
    const chaves = replicando ? (temSub ? c.subcategorias.map((sc) => sc.id) : ['']) : alteradas;
    const itens: ItemPlanejado[] = chaves.map((k) => ({
      tipo: receita ? 'receita' : 'despesa',
      categoriaId: c.id,
      subcategoriaId: k || null,
      valor: parseValor(rascunho.get(k) ?? ''),
    }));
    const meses = [mes, ...Array.from(mesesExtras)].sort((a, b) => a - b);
    setSalvando(true);
    setMensagem(null);
    const erro = await onSalvar(itens, meses);
    setSalvando(false);
    setMensagem(
      erro
        ? { tipo: 'erro', texto: erro }
        : {
            tipo: 'sucesso',
            texto: meses.length > 1 ? `Salvo em ${meses.map((i) => MESES_ABREV[i].toLowerCase()).join(', ')}.` : 'Orçamento salvo.',
          }
    );
    if (!erro) setMesesExtras(new Set());
  }

  /* ---- números do mês (com o rascunho, para ver o efeito antes de salvar) ---- */
  const orcado = temSub ? c.subcategorias.reduce((a, s) => a + num(s.id), 0) : num('');
  const exec = executadoNoMes(c, mes);
  const resto = orcado - exec;
  const dias = diasRestantes(ano, mes);
  const ritmo = dias != null ? 1 - (dias - 1) / new Date(ano, mes + 1, 0).getDate() : null;

  /* ---- lançamentos ---- */
  const [lancamentos, setLancamentos] = useState<LancamentoCategoria[] | null>(null);
  const [erroLanc, setErroLanc] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    setLancamentos(null);
    setErroLanc(null);
    buscarLancamentosCategoria(c.id, ano, mes).then((r) => {
      if (!ativo) return;
      if (r.error) setErroLanc(r.error);
      else setLancamentos(r.lancamentos ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [c.id, ano, mes]);
  const nomeSub = new Map(c.subcategorias.map((s) => [s.id, s.nome]));

  /* ---- histórico (até 6 meses, incluindo out–dez do ano anterior) ---- */
  const historico = Array.from({ length: mes - Math.max(mes - 5, -3) + 1 }, (_, i) => Math.max(mes - 5, -3) + i).map((m) => ({
    m,
    rotulo: m < 0 ? `${MESES_ABREV[m + 12]}/${String(ano - 1).slice(2)}` : MESES_ABREV[m],
    orc: m === mes ? orcado || null : orcadoEfetivo(c, m),
    exec: executadoNoMes(c, m),
  }));
  const maxHist = Math.max(1, ...historico.map((h) => Math.max(h.exec, h.orc ?? 0)));

  const statusTexto =
    orcado <= 0
      ? receita
        ? 'Sem valor previsto'
        : 'Sem orçamento definido'
      : receita
      ? resto > 0
        ? `Faltam ${formatCurrency(resto)}`
        : 'Previsto atingido ✓'
      : resto < 0
      ? `Passou ${formatCurrency(-resto)}`
      : `Restam ${formatCurrency(resto)}`;

  return (
    <Modal open onClose={fechar} title={c.nome} wide>
      <div className="space-y-5">
        {/* navegação de mês */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${c.cor ?? '#94a3b8'}22` }} aria-hidden>
            {emojiCategoria(c.nome, c.icone)}
          </span>
          <div className="flex items-center rounded-xl bg-gray-100 p-0.5">
            <button type="button" onClick={() => trocarMes(mes - 1)} disabled={mes === 0} className="rounded-lg p-1.5 text-gray-500 hover:bg-white disabled:opacity-30" aria-label="Mês anterior">
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[130px] text-center text-sm font-semibold text-gray-800">
              {MESES_COMPLETOS[mes]} {ano}
            </span>
            <button type="button" onClick={() => trocarMes(mes + 1)} disabled={mes === 11} className="rounded-lg p-1.5 text-gray-500 hover:bg-white disabled:opacity-30" aria-label="Próximo mês">
              <IconChevronRight className="h-4 w-4" />
            </button>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{receita ? 'Receita' : 'Despesa'}</span>
          <Link href={`/transacoes?mes=${ano}-${String(mes + 1).padStart(2, '0')}`} className="ml-auto text-xs font-semibold text-brand-600 hover:underline">
            Abrir em Transações →
          </Link>
        </div>

        {/* lançado x executado */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{receita ? 'Previsto' : 'Orçado'}</p>
            {temSub ? (
              <>
                <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{formatCurrency(orcado)}</p>
                <p className="mt-1 text-[11px] text-gray-500">soma das subcategorias abaixo</p>
              </>
            ) : (
              <div className="mt-1.5 space-y-2">
                <CampoValor rotulo={`Orçado de ${c.nome}`} valor={rascunho.get('') ?? ''} alterado={alteradas.includes('')} onChange={(v) => definir('', v)} />
                <Sugestoes l={c} mes={mes} atual={num('')} definir={(v) => definir('', v)} />
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{verbo}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{formatCurrency(exec)}</p>
            <p className="mt-1 text-[11px] text-gray-500">
              {lancamentos ? `${lancamentos.length} lançamento(s)` : '…'}
              {orcado > 0 && ` · ${Math.round((exec / orcado) * 100)}% do ${receita ? 'previsto' : 'orçado'}`}
            </p>
          </div>
          <div className={cn('rounded-2xl border p-4', !receita && resto < 0 && orcado > 0 ? 'border-red-100 bg-red-50/50' : 'border-gray-100 bg-white')}>
            <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Situação
              <span className="text-xl normal-case" title={humorOrcamento({ orcado, exec, receita }).dica}>
                {humorOrcamento({ orcado, exec, receita }).emoji}
              </span>
            </p>
            <p className={cn('mt-1 text-xl font-bold tabular-nums', !receita && resto < 0 && orcado > 0 ? 'text-negative' : 'text-gray-900')}>{statusTexto}</p>
            <p className="mt-1 text-[11px] text-gray-500">
              {dias != null && !receita && orcado > 0 && resto > 0
                ? `${formatCurrency(resto / dias)}/dia nos ${dias} dia(s) restantes`
                : mediaTresMeses(c, mes) > 0
                ? `média dos últimos 3 meses: ${formatCurrency(mediaTresMeses(c, mes))}`
                : ' '}
            </p>
          </div>
        </div>

        <BarraProgresso exec={exec} orcado={orcado} receita={receita} ritmo={ritmo} />

        {/* subcategorias */}
        {temSub && (
          <section>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Subcategorias</h4>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
              {c.subcategorias.map((s) => {
                const so = num(s.id);
                const se = executadoNoMes(s, mes);
                const sp = so > 0 ? (se / so) * 100 : 0;
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-gray-800">
                          <span className="mr-1.5" aria-hidden>{emojiCategoria(s.nome)}</span>
                          {s.nome}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-gray-500">
                          <b className="text-gray-800">{formatCurrency(se)}</b>
                          {so > 0 && ` de ${formatCurrency(so)} · ${Math.round(sp)}%`}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn('h-full rounded-full', so <= 0 ? 'bg-gray-300' : !receita && se > so ? 'bg-red-400' : 'bg-brand-400')}
                          style={{ width: `${so > 0 ? Math.min(100, sp) : se > 0 ? 100 : 0}%` }}
                        />
                      </div>
                      <div className="mt-1.5">
                        <Sugestoes l={s} mes={mes} atual={so} definir={(v) => definir(s.id, v)} />
                      </div>
                    </div>
                    <CampoValor rotulo={`Orçado de ${s.nome}`} valor={rascunho.get(s.id) ?? ''} alterado={alteradas.includes(s.id)} onChange={(v) => definir(s.id, v)} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* salvar */}
        <div className="space-y-3 rounded-2xl bg-gray-50 px-4 py-3">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs font-semibold text-gray-700">🔁 Replicar para os meses:</span>
              <button type="button" onClick={() => marcarMeses(Array.from({ length: 11 - mes }, (_, i) => mes + 1 + i))} className="text-[11px] font-semibold text-brand-600 hover:underline">
                próximos
              </button>
              <button type="button" onClick={() => marcarMeses(Array.from({ length: 12 }, (_, i) => i))} className="text-[11px] font-semibold text-brand-600 hover:underline">
                ano todo
              </button>
              {replicando && (
                <button type="button" onClick={() => marcarMeses([])} className="text-[11px] font-semibold text-gray-500 hover:underline">
                  limpar
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1" role="group" aria-label={`Meses de ${ano} para replicar`}>
              {MESES_ABREV.map((m, i) => {
                const atual = i === mes;
                const marcado = atual || mesesExtras.has(i);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => alternarMes(i)}
                    aria-pressed={marcado}
                    title={atual ? 'Mês aberto — sempre incluído' : marcado ? `Desmarcar ${m}` : `Replicar também em ${m}`}
                    className={cn(
                      'min-w-[44px] rounded-lg px-2 py-1.5 text-xs font-semibold transition',
                      atual
                        ? 'cursor-default bg-gray-900 text-white'
                        : marcado
                        ? 'bg-brand-500 text-white shadow-sm hover:bg-brand-600'
                        : 'bg-white text-gray-500 ring-1 ring-inset ring-gray-200 hover:text-gray-800 hover:ring-gray-300'
                    )}
                  >
                    {marcado && !atual ? '✓ ' : ''}
                    {m}
                  </button>
                );
              })}
            </div>
            {replicando && (
              <p className="mt-1.5 text-[11px] text-gray-500">
                Ao salvar, {MESES_ABREV[mes].toLowerCase()} e {mesesExtras.size} outro(s) mês(es) ficam com {temSub ? 'os mesmos valores em cada subcategoria' : 'o mesmo valor'} ({formatCurrency(orcado)}).
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200/70 pt-3">
          {mensagem && <span className={cn('text-xs', mensagem.tipo === 'erro' ? 'text-negative' : 'text-positive')}>{mensagem.texto}</span>}
          <span className="ml-auto flex gap-2">
            {alteradas.length > 0 && (
              <button type="button" onClick={() => setRascunho(original)} className="btn-secondary px-3 py-1.5 text-xs">
                <IconDesfazer className="h-3.5 w-3.5" /> Desfazer
              </button>
            )}
            <button type="button" onClick={salvar} disabled={salvando || !podeSalvar} className="btn-primary px-3 py-1.5 text-xs">
              <IconCheck className="h-3.5 w-3.5" />
              {salvando ? 'Salvando...' : replicando ? `Salvar em ${mesesExtras.size + 1} meses` : alteradas.length ? 'Salvar' : 'Salvo'}
            </button>
          </span>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* histórico */}
          <section>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Últimos meses</h4>
            <ul className="space-y-2 rounded-2xl border border-gray-100 p-4">
              {historico.map((h) => {
                const passou = !receita && h.orc != null && h.exec > h.orc;
                return (
                  <li key={h.m} className={cn('grid grid-cols-[48px_1fr_auto] items-center gap-3 text-xs', h.m === mes && 'font-semibold')}>
                    <span className="text-gray-500">{h.rotulo}</span>
                    <span className="relative h-2.5 rounded-full bg-gray-100">
                      <span
                        className={cn('absolute inset-y-0 left-0 rounded-full', passou ? 'bg-red-400' : receita ? 'bg-emerald-400' : 'bg-brand-400')}
                        style={{ width: `${(h.exec / maxHist) * 100}%` }}
                      />
                      {h.orc != null && (
                        <span className="absolute -top-0.5 h-3.5 w-0.5 rounded-full bg-gray-700" style={{ left: `calc(${(h.orc / maxHist) * 100}% - 1px)` }} title={`Orçado: ${formatCurrency(h.orc)}`} />
                      )}
                    </span>
                    <span className="tabular-nums text-gray-600">
                      {formatCurrency(h.exec)}
                      <span className="text-gray-400">{h.orc != null ? ` / ${formatCurrency(h.orc)}` : ''}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1.5 text-[11px] text-gray-400">Barra = {receita ? 'recebido' : 'gasto'} · traço escuro = {receita ? 'previsto' : 'orçado'}</p>
          </section>

          {/* lançamentos */}
          <section>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Lançamentos de {MESES_COMPLETOS[mes].toLowerCase()}</h4>
            <div className="max-h-72 overflow-y-auto rounded-2xl border border-gray-100">
              {erroLanc ? (
                <p className="px-4 py-6 text-center text-sm text-negative">{erroLanc}</p>
              ) : lancamentos == null ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">Carregando...</p>
              ) : lancamentos.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-500">Nenhum lançamento nesta categoria no mês.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {lancamentos.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-12 shrink-0 text-[11px] tabular-nums text-gray-400">{formatDate(t.data).slice(0, 5)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-gray-800">{t.descricao}</span>
                        {(t.subcategoria_id || t.pago === false) && (
                          <span className="block truncate text-[11px] text-gray-400">
                            {t.subcategoria_id ? nomeSub.get(t.subcategoria_id) : ''}
                            {t.pago === false && <span className="ml-1 font-semibold text-amber-600">pendente</span>}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{formatCurrency(t.valor)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}
