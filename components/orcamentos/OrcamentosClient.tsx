'use client';

import { Fragment, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { salvarOrcamento, sugerirOrcamentosVazios } from '@/app/(dashboard)/orcamentos/actions';
import { Modal } from '@/components/ui/Modal';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { IconChevronDown, IconChevronRight, IconCheck, IconOrcamentos, IconTrendUp, IconTrendDown, IconWallet } from '@/components/icons';
import { cn, formatCurrency, formatPercent0 } from '@/lib/utils';
import { resolverValorEfetivo } from '@/lib/orcamentos';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface SubcategoriaAnual {
  id: string;
  nome: string;
  valoresPorMes: (number | null)[];
  valoresExecutadosPorMes: number[];
}

export interface CategoriaAnual {
  id: string;
  nome: string;
  cor: string | null;
  valoresPorMes: (number | null)[];
  valoresExecutadosPorMes: number[];
  subcategorias: SubcategoriaAnual[];
}

function valorEfetivoCategoria(c: CategoriaAnual, mesIndex: number): number {
  const temSub = c.subcategorias.length > 0;
  const somaSubcategorias = c.subcategorias.reduce<number>((a, s) => a + (s.valoresPorMes[mesIndex] ?? 0), 0);
  return resolverValorEfetivo(temSub, c.valoresPorMes[mesIndex], somaSubcategorias);
}

function formatPercentAtingido(executado: number, orcado: number): string {
  if (orcado <= 0) return '—';
  return formatPercent0((executado / orcado) * 100);
}

function CelulaOrcamento({
  valor,
  label,
  onSalvar,
}: {
  valor: number | null;
  label: string;
  onSalvar: (novoValor: number | null, mesesAFrente: number) => Promise<string | undefined>;
}) {
  const valorTexto = valor != null ? String(valor) : '';
  const [texto, setTexto] = useState(valorTexto);
  const [salvo, setSalvo] = useState(valorTexto);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [escopo, setEscopo] = useState<'mes' | 'futuro'>('mes');
  const [quantidadeMeses, setQuantidadeMeses] = useState(12);

  // O valor pode mudar "por fora" (ex: aplicando o valor para os próximos
  // meses a partir de outra célula) — resincroniza o texto exibido quando
  // isso acontece, sem interferir numa edição em andamento nesta célula.
  useEffect(() => {
    setTexto(valorTexto);
    setSalvo(valorTexto);
  }, [valorTexto]);

  const alterado = texto !== salvo;

  function abrirConfirmacao() {
    if (!alterado) return;
    setModalAberto(true);
  }

  function cancelar() {
    setTexto(salvo);
    setModalAberto(false);
    setEscopo('mes');
  }

  async function confirmar() {
    setModalAberto(false);
    setSalvando(true);
    setErro(null);
    const numero = texto.trim() === '' ? null : Number(texto);
    const meses = escopo === 'futuro' ? Math.max(2, Math.min(36, quantidadeMeses)) : 1;
    const erroMsg = await onSalvar(numero, meses);
    setSalvando(false);
    setEscopo('mes');
    if (erroMsg) {
      setErro(erroMsg);
      return;
    }
    setSalvo(texto);
  }

  const numeroAtual = texto.trim() === '' ? 0 : Number(texto);

  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        min="0"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={abrirConfirmacao}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            abrirConfirmacao();
          }
        }}
        placeholder="—"
        title={erro ?? undefined}
        className={cn(
          'w-full min-w-[86px] rounded-md border bg-transparent px-1.5 py-1 text-right text-xs tabular-nums text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
          alterado ? 'pr-6' : '',
          erro ? 'border-negative' : 'border-transparent hover:border-gray-200',
          salvando && 'opacity-50'
        )}
      />
      {alterado && !salvando && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={abrirConfirmacao}
          aria-label="Salvar orçamento"
          className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded bg-brand-500 text-white hover:bg-brand-600"
        >
          <IconCheck className="h-3 w-3" />
        </button>
      )}

      <Modal open={modalAberto} onClose={cancelar} title="Aplicar orçamento">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Definir <span className="font-semibold text-gray-900">{label}</span> como{' '}
            <span className="font-semibold text-gray-900">{formatCurrency(numeroAtual)}</span>. Aplicar esse valor para:
          </p>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 p-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input
                type="radio"
                name="escopo"
                checked={escopo === 'mes'}
                onChange={() => setEscopo('mes')}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500"
              />
              Somente este mês
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 p-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input
                type="radio"
                name="escopo"
                checked={escopo === 'futuro'}
                onChange={() => setEscopo('futuro')}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500"
              />
              Este mês e os próximos
            </label>
          </div>

          {escopo === 'futuro' && (
            <div>
              <label className="label-field" htmlFor="quantidade_meses">
                Por quantos meses (incluindo este)?
              </label>
              <input
                id="quantidade_meses"
                type="number"
                min={2}
                max={36}
                value={quantidadeMeses}
                onChange={(e) => setQuantidadeMeses(Number(e.target.value))}
                className="input-field"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={cancelar} className="btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={confirmar} className="btn-primary">
              Salvar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const TOM_TABELA = {
  positivo: { cabecalho: 'bg-positive/5 text-positive', total: 'text-positive' },
  negativo: { cabecalho: 'bg-negative/5 text-negative', total: 'text-negative' },
} as const;

const COLUNAS_POR_MES = 3;
const TOTAL_COLUNAS = 1 + 12 * COLUNAS_POR_MES + COLUNAS_POR_MES;

function TabelaSecao({
  titulo,
  categorias,
  onEditar,
  totaisPorMes,
  totaisExecutadosPorMes,
  tom,
}: {
  titulo: string;
  categorias: CategoriaAnual[];
  onEditar: (
    categoriaId: string,
    subcategoriaId: string | null,
    mesIndex: number,
    novoValor: number | null,
    mesesAFrente: number
  ) => Promise<string | undefined>;
  totaisPorMes: number[];
  totaisExecutadosPorMes: number[];
  tom: 'positivo' | 'negativo';
}) {
  const classes = TOM_TABELA[tom];
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  function alternarExpandida(id: string) {
    setExpandidas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const totalExecutadoAno = totaisExecutadosPorMes.reduce((a, v) => a + v, 0);
  const totalOrcadoAno = totaisPorMes.reduce((a, v) => a + v, 0);

  return (
    <>
      <tr className={classes.cabecalho}>
        <td
          colSpan={TOTAL_COLUNAS}
          className={cn('sticky left-0 z-10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide', classes.cabecalho)}
        >
          {titulo}
        </td>
      </tr>
      {categorias.length === 0 && (
        <tr>
          <td colSpan={TOTAL_COLUNAS} className="px-3 py-4 text-center text-sm text-gray-400">
            Nenhuma categoria de {titulo.toLowerCase()} cadastrada.
          </td>
        </tr>
      )}
      {categorias.map((c) => {
        const temSub = c.subcategorias.length > 0;
        const expandida = expandidas.has(c.id);
        const valoresEfetivos = Array.from({ length: 12 }, (_, i) => valorEfetivoCategoria(c, i));
        const totalOrcadoCategoria = valoresEfetivos.reduce<number>((a, v) => a + v, 0);
        const totalExecutadoCategoria = c.valoresExecutadosPorMes.reduce<number>((a, v) => a + v, 0);
        return (
          <Fragment key={c.id}>
            <tr className="group border-b border-gray-50 transition-colors hover:bg-gray-50/60">
              <td className="sticky left-0 z-10 min-w-[200px] bg-white px-3 py-1.5 transition-colors group-hover:bg-gray-50">
                <button
                  type="button"
                  onClick={() => temSub && alternarExpandida(c.id)}
                  className="flex items-center gap-1.5 text-left"
                  disabled={!temSub}
                >
                  {temSub ? (
                    expandida ? (
                      <IconChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    ) : (
                      <IconChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    )
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.cor ?? '#888888' }} />
                  <span className="text-sm font-medium text-gray-800">{c.nome}</span>
                </button>
              </td>
              {MESES_ABREV.map((mes, i) => {
                const executado = c.valoresExecutadosPorMes[i] ?? 0;
                const orcado = valoresEfetivos[i];
                return (
                  <Fragment key={i}>
                    <td className="border-l border-gray-50 px-2 py-1 text-right text-xs tabular-nums text-gray-600">
                      {executado > 0 ? formatCurrency(executado) : '—'}
                    </td>
                    {temSub ? (
                      <td className="px-2 py-1 text-right text-xs tabular-nums text-gray-600">
                        {orcado > 0 ? formatCurrency(orcado) : '—'}
                      </td>
                    ) : (
                      <td className="px-1 py-1">
                        <CelulaOrcamento
                          valor={c.valoresPorMes[i]}
                          label={`${c.nome} · ${mes}`}
                          onSalvar={(v, meses) => onEditar(c.id, null, i, v, meses)}
                        />
                      </td>
                    )}
                    <td className="px-2 py-1 text-right text-xs tabular-nums text-gray-400">
                      {formatPercentAtingido(executado, orcado)}
                    </td>
                  </Fragment>
                );
              })}
              <td className="border-l border-gray-100 px-2 py-1.5 text-right text-xs font-semibold text-gray-900">
                {formatCurrency(totalExecutadoCategoria)}
              </td>
              <td className="px-2 py-1.5 text-right text-xs font-medium text-gray-500">
                {totalOrcadoCategoria > 0 ? formatCurrency(totalOrcadoCategoria) : '—'}
              </td>
              <td className="px-2 py-1.5 text-right text-xs font-medium text-gray-500">
                {formatPercentAtingido(totalExecutadoCategoria, totalOrcadoCategoria)}
              </td>
            </tr>
            {temSub &&
              expandida &&
              c.subcategorias.map((s) => {
                const totalOrcadoSub = s.valoresPorMes.reduce<number>((a, v) => a + (v ?? 0), 0);
                const totalExecutadoSub = s.valoresExecutadosPorMes.reduce<number>((a, v) => a + v, 0);
                return (
                  <tr key={s.id} className="border-b border-gray-50 bg-gray-50/40">
                    <td className="sticky left-0 z-10 bg-gray-50/40 py-1 pl-9 pr-3">
                      <span className="text-xs text-gray-500">{s.nome}</span>
                    </td>
                    {MESES_ABREV.map((mes, i) => {
                      const executado = s.valoresExecutadosPorMes[i] ?? 0;
                      return (
                        <Fragment key={i}>
                          <td className="border-l border-gray-50 px-2 py-1 text-right text-xs tabular-nums text-gray-500">
                            {executado > 0 ? formatCurrency(executado) : '—'}
                          </td>
                          <td className="px-1 py-1">
                            <CelulaOrcamento
                              valor={s.valoresPorMes[i]}
                              label={`${c.nome} · ${s.nome} · ${mes}`}
                              onSalvar={(v, meses) => onEditar(c.id, s.id, i, v, meses)}
                            />
                          </td>
                          <td className="px-2 py-1 text-right text-xs tabular-nums text-gray-400">
                            {formatPercentAtingido(executado, s.valoresPorMes[i] ?? 0)}
                          </td>
                        </Fragment>
                      );
                    })}
                    <td className="border-l border-gray-100 px-2 py-1 text-right text-xs font-medium text-gray-500">
                      {formatCurrency(totalExecutadoSub)}
                    </td>
                    <td className="px-2 py-1 text-right text-xs font-medium text-gray-500">
                      {totalOrcadoSub > 0 ? formatCurrency(totalOrcadoSub) : '—'}
                    </td>
                    <td className="px-2 py-1 text-right text-xs font-medium text-gray-500">
                      {formatPercentAtingido(totalExecutadoSub, totalOrcadoSub)}
                    </td>
                  </tr>
                );
              })}
          </Fragment>
        );
      })}
      <tr className="border-b-2 border-gray-100 font-semibold">
        <td className="sticky left-0 z-10 bg-white px-3 py-2 text-sm text-gray-900">TOTAL {titulo.toUpperCase()}</td>
        {totaisPorMes.map((v, i) => {
          const executado = totaisExecutadosPorMes[i];
          return (
            <Fragment key={i}>
              <td className={cn('border-l border-gray-100 px-2 py-2 text-right text-xs', classes.total)}>
                {formatCurrency(executado)}
              </td>
              <td className={cn('px-2 py-2 text-right text-xs', classes.total)}>{formatCurrency(v)}</td>
              <td className={cn('px-2 py-2 text-right text-xs', classes.total)}>{formatPercentAtingido(executado, v)}</td>
            </Fragment>
          );
        })}
        <td className={cn('border-l border-gray-100 px-2 py-2 text-right text-xs', classes.total)}>
          {formatCurrency(totalExecutadoAno)}
        </td>
        <td className={cn('px-2 py-2 text-right text-xs', classes.total)}>{formatCurrency(totalOrcadoAno)}</td>
        <td className={cn('px-2 py-2 text-right text-xs', classes.total)}>
          {formatPercentAtingido(totalExecutadoAno, totalOrcadoAno)}
        </td>
      </tr>
    </>
  );
}

export function OrcamentosClient({
  ano,
  categoriasReceita,
  categoriasDespesa,
}: {
  ano: number;
  categoriasReceita: CategoriaAnual[];
  categoriasDespesa: CategoriaAnual[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dadosReceita, setDadosReceita] = useState(categoriasReceita);
  const [dadosDespesa, setDadosDespesa] = useState(categoriasDespesa);

  const [sugerindo, startSugestao] = useTransition();
  const [mensagemSugestao, setMensagemSugestao] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  function aplicarSugestoes() {
    if (
      !window.confirm(
        `Preencher com valores sugeridos as categorias de despesa que ainda não têm orçamento definido em ${ano}? Categorias já preenchidas não serão alteradas.`
      )
    )
      return;
    setMensagemSugestao(null);
    startSugestao(async () => {
      const resultado = await sugerirOrcamentosVazios(ano);
      if (resultado.error) {
        setMensagemSugestao({ tipo: 'erro', texto: resultado.error });
        return;
      }
      if (!resultado.preenchidos) {
        setMensagemSugestao({ tipo: 'sucesso', texto: 'Todas as categorias já tinham orçamento definido — nada para preencher.' });
        return;
      }
      setMensagemSugestao({
        tipo: 'sucesso',
        texto: `${resultado.preenchidos} célula(s) preenchida(s) com base numa renda média de ${formatCurrency(resultado.rendaBase ?? 0)}/mês. Recarregando...`,
      });
      window.location.reload();
    });
  }

  function mudarAno(novoAno: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('ano', String(novoAno));
    router.push(`${pathname}?${params.toString()}`);
  }

  function atualizarLocal(
    setter: React.Dispatch<React.SetStateAction<CategoriaAnual[]>>,
    categoriaId: string,
    subcategoriaId: string | null,
    mesIndex: number,
    novoValor: number | null,
    mesesAFrente: number
  ) {
    const mesFinal = Math.min(11, mesIndex + mesesAFrente - 1);
    setter((prev) =>
      prev.map((c) => {
        if (c.id !== categoriaId) return c;
        if (subcategoriaId) {
          return {
            ...c,
            subcategorias: c.subcategorias.map((s) =>
              s.id === subcategoriaId
                ? { ...s, valoresPorMes: s.valoresPorMes.map((v, i) => (i >= mesIndex && i <= mesFinal ? novoValor : v)) }
                : s
            ),
          };
        }
        return { ...c, valoresPorMes: c.valoresPorMes.map((v, i) => (i >= mesIndex && i <= mesFinal ? novoValor : v)) };
      })
    );
  }

  async function editarReceita(
    categoriaId: string,
    subcategoriaId: string | null,
    mesIndex: number,
    novoValor: number | null,
    mesesAFrente: number
  ) {
    const mesRef = `${ano}-${String(mesIndex + 1).padStart(2, '0')}-01`;
    const resultado = await salvarOrcamento(categoriaId, subcategoriaId, mesRef, novoValor, mesesAFrente);
    if (resultado.error) return resultado.error;
    atualizarLocal(setDadosReceita, categoriaId, subcategoriaId, mesIndex, novoValor, mesesAFrente);
  }

  async function editarDespesa(
    categoriaId: string,
    subcategoriaId: string | null,
    mesIndex: number,
    novoValor: number | null,
    mesesAFrente: number
  ) {
    const mesRef = `${ano}-${String(mesIndex + 1).padStart(2, '0')}-01`;
    const resultado = await salvarOrcamento(categoriaId, subcategoriaId, mesRef, novoValor, mesesAFrente);
    if (resultado.error) return resultado.error;
    atualizarLocal(setDadosDespesa, categoriaId, subcategoriaId, mesIndex, novoValor, mesesAFrente);
  }

  const totalReceitasPorMes = useMemo(
    () => Array.from({ length: 12 }, (_, i) => dadosReceita.reduce((a, c) => a + valorEfetivoCategoria(c, i), 0)),
    [dadosReceita]
  );
  const totalGastosPorMes = useMemo(
    () => Array.from({ length: 12 }, (_, i) => dadosDespesa.reduce((a, c) => a + valorEfetivoCategoria(c, i), 0)),
    [dadosDespesa]
  );
  const totalReceitasExecutadoPorMes = useMemo(
    () => Array.from({ length: 12 }, (_, i) => dadosReceita.reduce((a, c) => a + (c.valoresExecutadosPorMes[i] ?? 0), 0)),
    [dadosReceita]
  );
  const totalGastosExecutadoPorMes = useMemo(
    () => Array.from({ length: 12 }, (_, i) => dadosDespesa.reduce((a, c) => a + (c.valoresExecutadosPorMes[i] ?? 0), 0)),
    [dadosDespesa]
  );
  const resultadoPorMes = useMemo(
    () => totalReceitasPorMes.map((v, i) => v - totalGastosPorMes[i]),
    [totalReceitasPorMes, totalGastosPorMes]
  );

  const totalAnoReceitas = totalReceitasPorMes.reduce((a, v) => a + v, 0);
  const totalAnoGastos = totalGastosPorMes.reduce((a, v) => a + v, 0);
  const totalAnoResultado = totalAnoReceitas - totalAnoGastos;

  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = Array.from({ length: 6 }, (_, i) => anoAtual + i);
  if (!anosDisponiveis.includes(ano)) anosDisponiveis.unshift(ano);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <IconOrcamentos className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
            <p className="mt-1 text-sm text-gray-500">Base anual de receitas e gastos, mês a mês</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={aplicarSugestoes} disabled={sugerindo} className="btn-secondary">
            {sugerindo ? 'Calculando sugestões...' : 'Sugerir orçamentos vazios'}
          </button>
          <select value={ano} onChange={(e) => mudarAno(Number(e.target.value))} className="input-field w-auto">
            {anosDisponiveis
              .sort((a, b) => b - a)
              .map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
          </select>
        </div>
      </div>

      {mensagemSugestao && (
        <p className={cn('text-sm', mensagemSugestao.tipo === 'erro' ? 'text-negative' : 'text-positive')}>
          {mensagemSugestao.texto}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard titulo="Total Receitas no ano" valor={totalAnoReceitas} tom="positivo" icon={IconTrendUp} />
        <SummaryCard titulo="Total Gastos no ano" valor={totalAnoGastos} tom="negativo" icon={IconTrendDown} />
        <SummaryCard
          titulo="Resultado do ano"
          valor={totalAnoResultado}
          tom={totalAnoResultado >= 0 ? 'positivo' : 'negativo'}
          icon={IconWallet}
        />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th
                rowSpan={2}
                className="sticky left-0 z-10 min-w-[200px] max-w-[200px] bg-white px-3 py-2 text-left align-bottom text-xs font-medium uppercase text-gray-400"
              >
                Categoria
              </th>
              {MESES_ABREV.map((label) => (
                <th
                  key={label}
                  colSpan={3}
                  className="border-l border-gray-100 px-1 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {label}
                </th>
              ))}
              <th colSpan={3} className="border-l border-gray-100 px-1 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total
              </th>
            </tr>
            <tr className="border-b border-gray-100">
              {MESES_ABREV.map((label) => (
                <Fragment key={label}>
                  <th className="min-w-[68px] border-l border-gray-100 px-2 py-1.5 text-right text-[10px] font-medium uppercase text-gray-400">
                    Exec.
                  </th>
                  <th className="min-w-[68px] px-1 py-1.5 text-right text-[10px] font-medium uppercase text-gray-400">Orç.</th>
                  <th className="min-w-[44px] px-2 py-1.5 text-right text-[10px] font-medium uppercase text-gray-400">%</th>
                </Fragment>
              ))}
              <th className="min-w-[68px] border-l border-gray-100 px-2 py-1.5 text-right text-[10px] font-medium uppercase text-gray-400">
                Exec.
              </th>
              <th className="min-w-[68px] px-2 py-1.5 text-right text-[10px] font-medium uppercase text-gray-400">Orç.</th>
              <th className="min-w-[44px] px-2 py-1.5 text-right text-[10px] font-medium uppercase text-gray-400">%</th>
            </tr>
          </thead>
          <tbody>
            <TabelaSecao
              titulo="Receitas"
              categorias={dadosReceita}
              onEditar={editarReceita}
              totaisPorMes={totalReceitasPorMes}
              totaisExecutadosPorMes={totalReceitasExecutadoPorMes}
              tom="positivo"
            />
            <TabelaSecao
              titulo="Gastos"
              categorias={dadosDespesa}
              onEditar={editarDespesa}
              totaisPorMes={totalGastosPorMes}
              totaisExecutadosPorMes={totalGastosExecutadoPorMes}
              tom="negativo"
            />
            <tr className="bg-gray-900">
              <td className="sticky left-0 z-10 bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white">RESULTADO</td>
              {resultadoPorMes.map((v, i) => (
                <td
                  key={i}
                  colSpan={3}
                  className={cn('border-l border-gray-800 px-2 py-2.5 text-right text-xs font-semibold', v >= 0 ? 'text-positive' : 'text-red-400')}
                >
                  {formatCurrency(v)}
                </td>
              ))}
              <td
                colSpan={3}
                className={cn('border-l border-gray-800 px-2 py-2.5 text-right text-xs font-semibold', totalAnoResultado >= 0 ? 'text-positive' : 'text-red-400')}
              >
                {formatCurrency(totalAnoResultado)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
