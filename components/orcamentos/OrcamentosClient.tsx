'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { salvarOrcamento } from '@/app/(dashboard)/orcamentos/actions';
import { Modal } from '@/components/ui/Modal';
import { IconChevronDown, IconChevronRight, IconCheck } from '@/components/icons';
import { cn, formatCurrency } from '@/lib/utils';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface SubcategoriaAnual {
  id: string;
  nome: string;
  valoresPorMes: (number | null)[];
}

export interface CategoriaAnual {
  id: string;
  nome: string;
  cor: string | null;
  valoresPorMes: (number | null)[];
  subcategorias: SubcategoriaAnual[];
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

function TabelaSecao({
  titulo,
  categorias,
  onEditar,
  totaisPorMes,
  corTotal,
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
  corTotal: string;
}) {
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  function alternarExpandida(id: string) {
    setExpandidas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <>
      <tr className="bg-gray-50">
        <td colSpan={14} className="sticky left-0 z-10 bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {titulo}
        </td>
      </tr>
      {categorias.length === 0 && (
        <tr>
          <td colSpan={14} className="px-3 py-4 text-center text-sm text-gray-400">
            Nenhuma categoria de {titulo.toLowerCase()} cadastrada.
          </td>
        </tr>
      )}
      {categorias.map((c) => {
        const temSub = c.subcategorias.length > 0;
        const expandida = expandidas.has(c.id);
        const totalCategoria = c.valoresPorMes.reduce<number>((a, v) => a + (v ?? 0), 0);
        return (
          <>
            <tr key={c.id} className="border-b border-gray-50">
              <td className="sticky left-0 z-10 min-w-[200px] bg-white px-3 py-1.5">
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
              {MESES_ABREV.map((mes, i) => (
                <td key={i} className="px-1 py-1">
                  <CelulaOrcamento
                    valor={c.valoresPorMes[i]}
                    label={`${c.nome} · ${mes}`}
                    onSalvar={(v, meses) => onEditar(c.id, null, i, v, meses)}
                  />
                </td>
              ))}
              <td className="px-2 py-1.5 text-right text-xs font-semibold text-gray-900">{formatCurrency(totalCategoria)}</td>
            </tr>
            {temSub &&
              expandida &&
              c.subcategorias.map((s) => {
                const totalSub = s.valoresPorMes.reduce<number>((a, v) => a + (v ?? 0), 0);
                return (
                  <tr key={s.id} className="border-b border-gray-50 bg-gray-50/40">
                    <td className="sticky left-0 z-10 bg-gray-50/40 py-1 pl-9 pr-3">
                      <span className="text-xs text-gray-500">{s.nome}</span>
                    </td>
                    {MESES_ABREV.map((mes, i) => (
                      <td key={i} className="px-1 py-1">
                        <CelulaOrcamento
                          valor={s.valoresPorMes[i]}
                          label={`${c.nome} · ${s.nome} · ${mes}`}
                          onSalvar={(v, meses) => onEditar(c.id, s.id, i, v, meses)}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right text-xs font-medium text-gray-500">{formatCurrency(totalSub)}</td>
                  </tr>
                );
              })}
          </>
        );
      })}
      <tr className="border-b-2 border-gray-100 font-semibold">
        <td className="sticky left-0 z-10 bg-white px-3 py-2 text-sm text-gray-900">TOTAL {titulo.toUpperCase()}</td>
        {totaisPorMes.map((v, i) => (
          <td key={i} className="px-2 py-2 text-right text-xs" style={{ color: corTotal }}>
            {formatCurrency(v)}
          </td>
        ))}
        <td className="px-2 py-2 text-right text-xs" style={{ color: corTotal }}>
          {formatCurrency(totaisPorMes.reduce((a, v) => a + v, 0))}
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
    () => Array.from({ length: 12 }, (_, i) => dadosReceita.reduce((a, c) => a + (c.valoresPorMes[i] ?? 0), 0)),
    [dadosReceita]
  );
  const totalGastosPorMes = useMemo(
    () => Array.from({ length: 12 }, (_, i) => dadosDespesa.reduce((a, c) => a + (c.valoresPorMes[i] ?? 0), 0)),
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
  const anosDisponiveis = Array.from({ length: 6 }, (_, i) => anoAtual - i);
  if (!anosDisponiveis.includes(ano)) anosDisponiveis.unshift(ano);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="mt-1 text-sm text-gray-500">Base anual de receitas e gastos, mês a mês</p>
        </div>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-500">Total Receitas no ano</p>
          <p className="mt-2 text-xl font-bold text-positive">{formatCurrency(totalAnoReceitas)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-500">Total Gastos no ano</p>
          <p className="mt-2 text-xl font-bold text-negative">{formatCurrency(totalAnoGastos)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-500">Resultado do ano</p>
          <p className={cn('mt-2 text-xl font-bold', totalAnoResultado >= 0 ? 'text-positive' : 'text-negative')}>
            {formatCurrency(totalAnoResultado)}
          </p>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="sticky left-0 z-10 min-w-[200px] bg-white px-3 py-2 text-left text-xs font-medium uppercase text-gray-400">
                Categoria
              </th>
              {MESES_ABREV.map((label) => (
                <th key={label} className="min-w-[86px] px-1 py-2 text-right text-xs font-medium uppercase text-gray-400">
                  {label}
                </th>
              ))}
              <th className="min-w-[100px] px-2 py-2 text-right text-xs font-medium uppercase text-gray-400">Total</th>
            </tr>
          </thead>
          <tbody>
            <TabelaSecao
              titulo="Receitas"
              categorias={dadosReceita}
              onEditar={editarReceita}
              totaisPorMes={totalReceitasPorMes}
              corTotal="#16a34a"
            />
            <TabelaSecao
              titulo="Gastos"
              categorias={dadosDespesa}
              onEditar={editarDespesa}
              totaisPorMes={totalGastosPorMes}
              corTotal="#dc2626"
            />
            <tr className="bg-gray-900">
              <td className="sticky left-0 z-10 bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white">RESULTADO</td>
              {resultadoPorMes.map((v, i) => (
                <td key={i} className={cn('px-2 py-2.5 text-right text-xs font-semibold', v >= 0 ? 'text-positive' : 'text-red-400')}>
                  {formatCurrency(v)}
                </td>
              ))}
              <td className={cn('px-2 py-2.5 text-right text-xs font-semibold', totalAnoResultado >= 0 ? 'text-positive' : 'text-red-400')}>
                {formatCurrency(totalAnoResultado)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
