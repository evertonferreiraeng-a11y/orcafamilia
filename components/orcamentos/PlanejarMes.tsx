'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CategoriaAnual, SubcategoriaAnual } from '@/components/orcamentos/OrcamentosClient';
import { IconCheck, IconChevronRight, IconDesfazer, IconRecorrente, IconChart } from '@/components/icons';
import { cn, formatCurrency } from '@/lib/utils';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type Linha = CategoriaAnual | SubcategoriaAnual;

export interface ItemPlanejado {
  tipo: 'receita' | 'despesa';
  categoriaId: string;
  subcategoriaId: string | null;
  valor: number | null;
}

/* ---------- helpers de histórico ---------- */

/** Executado no mês (aceita -1..-3 = out..dez do ano anterior). */
export function executadoNoMes(l: Linha, mes: number): number {
  if (mes >= 0) return l.valoresExecutadosPorMes[mes] ?? 0;
  return l.executadoAnterior?.[mes + 3] ?? 0;
}

/** Média dos últimos 3 meses fechados, ignorando meses sem nenhum lançamento. */
export function mediaTresMeses(l: Linha, mes: number): number {
  const valores = [mes - 1, mes - 2, mes - 3].map((m) => executadoNoMes(l, m)).filter((v) => v > 0);
  if (!valores.length) return 0;
  return valores.reduce((a, v) => a + v, 0) / valores.length;
}

function orcadoMesAnterior(l: Linha, mes: number): number | null {
  return mes > 0 ? l.valoresPorMes[mes - 1] : l.orcadoDezAnterior ?? null;
}

function arredondar(v: number): number {
  // sugestões arredondadas para dezenas — ninguém planeja R$ 2.637,41
  return v >= 100 ? Math.round(v / 10) * 10 : Math.round(v);
}

/** Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234". Vazio = sem orçamento. */
function parseValor(texto: string): number | null {
  let t = texto.replace(/R\$|\s/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatarEntrada(v: number | null): string {
  if (v == null || v <= 0) return '';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const chave = (categoriaId: string, subcategoriaId: string | null) => `${categoriaId}|${subcategoriaId ?? ''}`;

/* ---------- campo de valor ---------- */

function CampoValor({
  valor,
  onChange,
  alterado,
  rotulo,
}: {
  valor: string;
  onChange: (v: string) => void;
  alterado: boolean;
  rotulo: string;
}) {
  return (
    <div className="relative w-32 shrink-0">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
      <input
        data-planejar
        inputMode="decimal"
        aria-label={rotulo}
        value={valor}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const campos = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-planejar]'));
          const i = campos.indexOf(e.currentTarget);
          campos[e.shiftKey ? i - 1 : i + 1]?.focus();
        }}
        className={cn(
          'w-full rounded-xl border bg-white py-2 pl-8 pr-2.5 text-right text-sm font-semibold tabular-nums text-gray-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200',
          alterado ? 'border-brand-300 bg-brand-50/40' : 'border-gray-200'
        )}
      />
    </div>
  );
}

function ChipSugestao({ rotulo, valor, ativo, onClick }: { rotulo: string; valor: number; ativo: boolean; onClick: () => void }) {
  if (valor <= 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Usar ${formatCurrency(valor)}`}
      className={cn(
        'rounded-lg px-2 py-1 text-[11px] font-semibold transition',
        ativo ? 'bg-brand-100 text-brand-700' : 'bg-gray-50 text-gray-500 ring-1 ring-inset ring-gray-200 hover:bg-gray-100 hover:text-gray-800'
      )}
    >
      {rotulo}
    </button>
  );
}

/* ---------- linha de categoria ---------- */

function LinhaPlanejamento({
  c,
  mes,
  rascunho,
  original,
  definir,
  receita,
}: {
  c: CategoriaAnual;
  mes: number;
  rascunho: Map<string, string>;
  original: Map<string, string>;
  definir: (k: string, v: string) => void;
  receita?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const temSub = c.subcategorias.length > 0;
  const abrevAnterior = MESES_ABREV[(mes + 11) % 12].toLowerCase();

  const valorDe = (subId: string | null) => parseValor(rascunho.get(chave(c.id, subId)) ?? '') ?? 0;
  const total = temSub ? c.subcategorias.reduce((a, s) => a + valorDe(s.id), 0) : valorDe(null);
  const algumaSubAlterada = temSub && c.subcategorias.some((s) => rascunho.get(chave(c.id, s.id)) !== original.get(chave(c.id, s.id)));

  const gastoAnterior = executadoNoMes(c, mes - 1);
  const media = mediaTresMeses(c, mes);
  const verbo = receita ? 'recebido' : 'gasto';

  function sugestoes(l: Linha, subId: string | null) {
    const k = chave(c.id, subId);
    const atual = parseValor(rascunho.get(k) ?? '') ?? 0;
    const ant = orcadoMesAnterior(l, mes) ?? 0;
    const med = arredondar(mediaTresMeses(l, mes));
    const real = arredondar(executadoNoMes(l, mes - 1));
    return (
      <div className="flex shrink-0 flex-wrap justify-end gap-1">
        <ChipSugestao rotulo={`= ${abrevAnterior}`} valor={ant} ativo={atual > 0 && atual === ant} onClick={() => definir(k, formatarEntrada(ant))} />
        <ChipSugestao rotulo="média" valor={med} ativo={atual > 0 && atual === med} onClick={() => definir(k, formatarEntrada(med))} />
        {real !== med && (
          <ChipSugestao rotulo={`real ${abrevAnterior}`} valor={real} ativo={atual > 0 && atual === real} onClick={() => definir(k, formatarEntrada(real))} />
        )}
      </div>
    );
  }

  return (
    <li className="border-b border-gray-100 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap">
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c.cor ?? '#94a3b8' }} />
        <button
          type="button"
          className={cn('min-w-0 flex-1 text-left', !temSub && 'cursor-default')}
          onClick={() => temSub && setAberto((v) => !v)}
          aria-expanded={temSub ? aberto : undefined}
        >
          <span className="flex items-center gap-1 truncate text-sm font-semibold text-gray-900">
            {c.nome}
            {temSub && <IconChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform', aberto && 'rotate-90')} />}
            {temSub && <span className="text-[11px] font-normal text-gray-400">{c.subcategorias.length} sub</span>}
          </span>
          <span className="block truncate text-xs text-gray-500">
            {gastoAnterior > 0 ? `${MESES_ABREV[(mes + 11) % 12]}: ${formatCurrency(gastoAnterior)} ${verbo}` : `Nada ${verbo} em ${abrevAnterior}`}
            {media > 0 && ` · média 3m ${formatCurrency(media)}`}
          </span>
        </button>
        {temSub ? (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className={cn(
              'w-32 shrink-0 rounded-xl border px-2.5 py-2 text-right text-sm font-semibold tabular-nums',
              algumaSubAlterada ? 'border-brand-300 bg-brand-50/40 text-gray-900' : 'border-dashed border-gray-200 text-gray-700'
            )}
            title="Soma das subcategorias — clique para editar"
          >
            {formatCurrency(total)}
          </button>
        ) : (
          <>
            {sugestoes(c, null)}
            <CampoValor
              rotulo={c.nome}
              valor={rascunho.get(chave(c.id, null)) ?? ''}
              alterado={rascunho.get(chave(c.id, null)) !== original.get(chave(c.id, null))}
              onChange={(v) => definir(chave(c.id, null), v)}
            />
          </>
        )}
      </div>
      {temSub && aberto && (
        <ul className="space-y-1 bg-gray-50/70 px-4 py-2 sm:pl-10">
          {c.subcategorias.map((s) => {
            const k = chave(c.id, s.id);
            const ga = executadoNoMes(s, mes - 1);
            const ms = mediaTresMeses(s, mes);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 sm:flex-nowrap">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-gray-800">{s.nome}</span>
                  <span className="block truncate text-[11px] text-gray-500">
                    {ga > 0 ? `${MESES_ABREV[(mes + 11) % 12]}: ${formatCurrency(ga)}` : `—`}
                    {ms > 0 && ` · média ${formatCurrency(ms)}`}
                  </span>
                </span>
                {sugestoes(s, s.id)}
                <CampoValor rotulo={`${c.nome} — ${s.nome}`} valor={rascunho.get(k) ?? ''} alterado={rascunho.get(k) !== original.get(k)} onChange={(v) => definir(k, v)} />
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/* ---------- aba ---------- */

export function PlanejarMes({
  ano,
  mes,
  receitas,
  despesas,
  onSalvar,
  onAlteracoesPendentes,
}: {
  ano: number;
  mes: number;
  receitas: CategoriaAnual[];
  despesas: CategoriaAnual[];
  onSalvar: (itens: ItemPlanejado[], meses: number[]) => Promise<string | undefined>;
  onAlteracoesPendentes?: (pendentes: boolean) => void;
}) {
  const original = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of [...receitas, ...despesas]) {
      m.set(chave(c.id, null), formatarEntrada(c.valoresPorMes[mes]));
      for (const s of c.subcategorias) m.set(chave(c.id, s.id), formatarEntrada(s.valoresPorMes[mes]));
    }
    return m;
  }, [receitas, despesas, mes]);

  const [rascunho, setRascunho] = useState(original);
  const [ateDezembro, setAteDezembro] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [filtro, setFiltro] = useState('');

  // Ao trocar de mês (ou após salvar), recomeça a partir do que está gravado.
  useEffect(() => {
    setRascunho(original);
  }, [original]);

  const alteradas = useMemo(
    () => Array.from(rascunho.keys()).filter((k) => (parseValor(rascunho.get(k) ?? '') ?? 0) !== (parseValor(original.get(k) ?? '') ?? 0)),
    [rascunho, original]
  );
  useEffect(() => {
    onAlteracoesPendentes?.(alteradas.length > 0);
  }, [alteradas.length, onAlteracoesPendentes]);

  function definir(k: string, v: string) {
    setMensagem(null);
    setRascunho((prev) => new Map(prev).set(k, v));
  }

  function preencherTodos(fonte: (l: Linha) => number | null) {
    setMensagem(null);
    setRascunho((prev) => {
      const novo = new Map(prev);
      for (const c of [...receitas, ...despesas]) {
        const linhas: [Linha, string | null][] = c.subcategorias.length ? c.subcategorias.map((s): [Linha, string | null] => [s, s.id]) : [[c, null]];
        for (const [l, subId] of linhas) {
          const v = fonte(l);
          if (v != null && v > 0) novo.set(chave(c.id, subId), formatarEntrada(v));
        }
      }
      return novo;
    });
  }

  const efetivo = (c: CategoriaAnual) =>
    c.subcategorias.length
      ? c.subcategorias.reduce((a, s) => a + (parseValor(rascunho.get(chave(c.id, s.id)) ?? '') ?? 0), 0)
      : parseValor(rascunho.get(chave(c.id, null)) ?? '') ?? 0;

  const totalReceitas = receitas.reduce((a, c) => a + efetivo(c), 0);
  const totalGastos = despesas.reduce((a, c) => a + efetivo(c), 0);
  const sobra = totalReceitas - totalGastos;
  const base = Math.max(totalReceitas, totalGastos, 1);
  const fatias = despesas
    .map((c) => ({ c, v: efetivo(c) }))
    .filter((f) => f.v > 0)
    .sort((a, b) => b.v - a.v);

  async function salvar() {
    if (!alteradas.length) return;
    const tipoDe = new Map<string, 'receita' | 'despesa'>();
    receitas.forEach((c) => tipoDe.set(c.id, 'receita'));
    despesas.forEach((c) => tipoDe.set(c.id, 'despesa'));
    const itens: ItemPlanejado[] = alteradas.map((k) => {
      const [categoriaId, sub] = k.split('|');
      return { tipo: tipoDe.get(categoriaId) ?? 'despesa', categoriaId, subcategoriaId: sub || null, valor: parseValor(rascunho.get(k) ?? '') };
    });
    const meses = ateDezembro ? Array.from({ length: 12 - mes }, (_, i) => mes + i) : [mes];
    setSalvando(true);
    setMensagem(null);
    const erro = await onSalvar(itens, meses);
    setSalvando(false);
    if (erro) {
      setMensagem({ tipo: 'erro', texto: erro });
      return;
    }
    setMensagem({
      tipo: 'sucesso',
      texto: `${itens.length} valor(es) salvo(s) em ${meses.length > 1 ? `${MESES_ABREV[mes]}–Dez` : MESES_COMPLETOS[mes].toLowerCase()}.`,
    });
  }

  const termo = filtro.trim().toLowerCase();
  const filtrar = (l: CategoriaAnual[]) =>
    termo ? l.filter((c) => c.nome.toLowerCase().includes(termo) || c.subcategorias.some((s) => s.nome.toLowerCase().includes(termo))) : l;
  const mesAnteriorNome = mes > 0 ? MESES_COMPLETOS[mes - 1].toLowerCase() : `dezembro/${ano - 1}`;

  return (
    <div className="space-y-4">
      {/* placar fixo */}
      <div className="z-20 rounded-2xl md:sticky md:top-[76px] border border-gray-100 bg-white/95 p-4 shadow-card backdrop-blur">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Receita prevista</p>
            <p className="text-lg font-bold tabular-nums text-gray-900 sm:text-xl">{formatCurrency(totalReceitas)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Gastos planejados</p>
            <p className="text-lg font-bold tabular-nums text-gray-900 sm:text-xl">{formatCurrency(totalGastos)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{sobra >= 0 ? 'Sobra para metas' : 'Faltando'}</p>
            <p className={cn('text-lg font-bold tabular-nums sm:text-xl', sobra >= 0 ? 'text-positive' : 'text-negative')}>{formatCurrency(Math.abs(sobra))}</p>
          </div>
        </div>

        <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-gray-100">
          {fatias.map(({ c, v }) => (
            <div
              key={c.id}
              title={`${c.nome}: ${formatCurrency(v)} (${Math.round((v / base) * 100)}%)`}
              className="h-full transition-all duration-500"
              style={{ width: `${(v / base) * 100}%`, backgroundColor: c.cor ?? '#94a3b8' }}
            />
          ))}
        </div>
        {fatias.length > 0 && (
          <p className="mt-1.5 truncate text-[11px] text-gray-500">
            {fatias
              .slice(0, 5)
              .map(({ c, v }) => `${c.nome} ${Math.round((v / base) * 100)}%`)
              .join(' · ')}
            {fatias.length > 5 && ` · +${fatias.length - 5}`}
            {totalReceitas > 0 && sobra > 0 && ` · livre ${Math.round((sobra / totalReceitas) * 100)}%`}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={ateDezembro} onChange={(e) => setAteDezembro(e.target.checked)} className="rounded border-gray-300 text-brand-600" />
            Aplicar também aos meses seguintes até dezembro
          </label>
          <span className="ml-auto flex items-center gap-2">
            {alteradas.length > 0 && (
              <button type="button" onClick={() => setRascunho(original)} className="btn-secondary px-3 py-1.5 text-xs">
                <IconDesfazer className="h-3.5 w-3.5" /> Desfazer
              </button>
            )}
            <button type="button" onClick={salvar} disabled={salvando || !alteradas.length} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50">
              <IconCheck className="h-3.5 w-3.5" />
              {salvando ? 'Salvando...' : alteradas.length ? `Salvar ${alteradas.length} alteração(ões)` : 'Tudo salvo'}
            </button>
          </span>
        </div>
        {mensagem && <p className={cn('mt-2 text-xs', mensagem.tipo === 'erro' ? 'text-negative' : 'text-positive')}>{mensagem.texto}</p>}
      </div>

      {/* atalhos */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => preencherTodos((l) => orcadoMesAnterior(l, mes))} className="btn-secondary px-3 py-1.5 text-xs">
          <IconRecorrente className="h-3.5 w-3.5" /> Copiar {mesAnteriorNome}
        </button>
        <button type="button" onClick={() => preencherTodos((l) => arredondar(mediaTresMeses(l, mes)))} className="btn-secondary px-3 py-1.5 text-xs">
          <IconChart className="h-3.5 w-3.5" /> Usar média de 3 meses
        </button>
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar categoria"
          className="ml-auto w-44 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
        />
      </div>
      <p className="-mt-2 text-[11px] text-gray-400">
        Os atalhos só preenchem os campos — nada é gravado até você clicar em Salvar. Enter passa para o próximo campo.
      </p>

      {(
        [
          ['📉 Gastos', filtrar(despesas), false],
          ['📈 Receitas', filtrar(receitas), true],
        ] as const
      ).map(([titulo, lista, receita]) => (
        <section key={titulo}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            {titulo} de {MESES_COMPLETOS[mes].toLowerCase()}
            <span className="ml-auto text-xs font-normal tabular-nums text-gray-500">{formatCurrency(receita ? totalReceitas : totalGastos)}</span>
          </h3>
          {lista.length ? (
            <ul className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
              {lista.map((c) => (
                <LinhaPlanejamento key={c.id} c={c} mes={mes} rascunho={rascunho} original={original} definir={definir} receita={receita} />
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white/60 px-4 py-6 text-center text-sm text-gray-500">
              {termo ? 'Nenhuma categoria encontrada.' : 'Cadastre categorias em Cadastro para planejar aqui.'}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
