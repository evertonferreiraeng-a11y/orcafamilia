'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { TransacaoForm } from '@/components/transacoes/TransacaoForm';
import { FaturasView } from '@/components/transacoes/FaturasView';
import { MultiSelectFiltro } from '@/components/transacoes/MultiSelectFiltro';
import {
  IconPlus,
  IconEdit,
  IconSearch,
  IconWallet,
  IconTrendUp,
  IconTrendDown,
  IconRelogio,
  IconOrdenar,
  IconFiltro,
  IconCartao,
} from '@/components/icons';
import { criarTransacao, atualizarTransacao, excluirTransacao, alternarPagoTransacao } from '@/app/(dashboard)/transacoes/actions';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Categoria, Subcategoria, Conta, Cartao, Transacao } from '@/types/database';

export interface TransacaoComRelacoes extends Transacao {
  categoriaNome: string | null;
  categoriaCor: string | null;
  subcategoriaNome: string | null;
  contaNome: string | null;
  cartaoNome: string | null;
}

interface Resumo {
  saldo: number;
  receitas: number;
  receitasPendentes: number;
  despesas: number;
  despesasPendentes: number;
}

type StatusFiltro = 'todas' | 'pago' | 'pendente';
type SortKey = 'registro' | 'pagamento' | 'valor';
type SortDir = 'asc' | 'desc';

const OPCOES_PERIODO = [
  { value: '', label: 'Todo o período' },
  { value: 'mes-atual', label: 'Este mês' },
  { value: 'mes-anterior', label: 'Mês passado' },
  { value: 'ultimos-30', label: 'Últimos 30 dias' },
  { value: 'ultimos-90', label: 'Últimos 90 dias' },
  { value: 'este-ano', label: 'Este ano' },
];

function paraISO(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function calcularIntervaloPeriodo(preset: string): { inicio: string; fim: string } | null {
  if (!preset) return null;
  const hoje = new Date();

  switch (preset) {
    case 'mes-atual':
      return {
        inicio: paraISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
        fim: paraISO(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
      };
    case 'mes-anterior':
      return {
        inicio: paraISO(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
        fim: paraISO(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
      };
    case 'ultimos-30': {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 30);
      return { inicio: paraISO(inicio), fim: paraISO(hoje) };
    }
    case 'ultimos-90': {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 90);
      return { inicio: paraISO(inicio), fim: paraISO(hoje) };
    }
    case 'este-ano':
      return {
        inicio: paraISO(new Date(hoje.getFullYear(), 0, 1)),
        fim: paraISO(new Date(hoje.getFullYear(), 11, 31)),
      };
    default:
      return null;
  }
}

export function TransacoesClient({
  transacoes,
  categorias,
  subcategorias,
  contas,
  cartoes,
  resumo,
  seletorMes,
}: {
  transacoes: TransacaoComRelacoes[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  contas: Conta[];
  cartoes: Cartao[];
  resumo: Resumo;
  seletorMes: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const porRegistro = searchParams.get('porRegistro') === '1';

  const [visao, setVisao] = useState<'lista' | 'faturas'>('lista');
  const [modalForm, setModalForm] = useState(false);
  const [modalFiltros, setModalFiltros] = useState(false);
  const [editando, setEditando] = useState<Transacao | undefined>(undefined);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todas');

  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [filtroCategorias, setFiltroCategorias] = useState<string[]>([]);
  const [filtroSubcategorias, setFiltroSubcategorias] = useState<string[]>([]);
  const [filtroContas, setFiltroContas] = useState<string[]>([]);
  const [filtroCartoes, setFiltroCartoes] = useState<string[]>([]);
  const [filtroStatusAvancado, setFiltroStatusAvancado] = useState<string[]>([]);
  const [filtroValorMin, setFiltroValorMin] = useState('');
  const [filtroValorMax, setFiltroValorMax] = useState('');
  const [somenteRecorrentes, setSomenteRecorrentes] = useState(false);
  const [somenteParceladas, setSomenteParceladas] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('pagamento');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function limparFiltrosAvancados() {
    setFiltroPeriodo('');
    setFiltroCategorias([]);
    setFiltroSubcategorias([]);
    setFiltroContas([]);
    setFiltroCartoes([]);
    setFiltroStatusAvancado([]);
    setFiltroValorMin('');
    setFiltroValorMax('');
    setSomenteRecorrentes(false);
    setSomenteParceladas(false);
  }

  function abrirNova() {
    setEditando(undefined);
    setModalForm(true);
  }

  function abrirEdicao(t: Transacao) {
    setEditando(t);
    setModalForm(true);
  }

  function alternarDataBase() {
    const params = new URLSearchParams(searchParams.toString());
    if (porRegistro) params.delete('porRegistro');
    else params.set('porRegistro', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  function ordenarPor(chave: SortKey) {
    if (sortKey === chave) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(chave);
      setSortDir('desc');
    }
  }

  const periodoIntervalo = useMemo(() => calcularIntervaloPeriodo(filtroPeriodo), [filtroPeriodo]);

  const transacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const min = filtroValorMin ? Number(filtroValorMin) : null;
    const max = filtroValorMax ? Number(filtroValorMax) : null;

    let lista = transacoes.filter((t) => {
      if (filtroStatus === 'pago' && !t.pago) return false;
      if (filtroStatus === 'pendente' && t.pago) return false;
      if (somenteRecorrentes && !t.recorrente) return false;
      if (somenteParceladas && !t.parcela_total) return false;
      if (periodoIntervalo && (t.data < periodoIntervalo.inicio || t.data > periodoIntervalo.fim)) return false;
      if (filtroCategorias.length > 0 && (!t.categoria_id || !filtroCategorias.includes(t.categoria_id))) return false;
      if (filtroSubcategorias.length > 0 && (!t.subcategoria_id || !filtroSubcategorias.includes(t.subcategoria_id)))
        return false;
      if (filtroContas.length > 0 && (!t.conta_id || !filtroContas.includes(t.conta_id))) return false;
      if (filtroCartoes.length > 0 && (!t.cartao_id || !filtroCartoes.includes(t.cartao_id))) return false;
      if (filtroStatusAvancado.length > 0) {
        const statusAtual = t.pago ? 'pago' : 'pendente';
        if (!filtroStatusAvancado.includes(statusAtual)) return false;
      }
      if (min !== null && t.valor < min) return false;
      if (max !== null && t.valor > max) return false;
      if (!termo) return true;
      return t.descricao.toLowerCase().includes(termo) || (t.categoriaNome ?? '').toLowerCase().includes(termo);
    });

    lista = [...lista].sort((a, b) => {
      let comparacao = 0;
      if (sortKey === 'registro') comparacao = a.criado_em.localeCompare(b.criado_em);
      else if (sortKey === 'pagamento') comparacao = a.data.localeCompare(b.data);
      else comparacao = a.valor - b.valor;
      return sortDir === 'asc' ? comparacao : -comparacao;
    });

    return lista;
  }, [
    transacoes,
    busca,
    filtroStatus,
    somenteRecorrentes,
    somenteParceladas,
    periodoIntervalo,
    filtroCategorias,
    filtroSubcategorias,
    filtroContas,
    filtroCartoes,
    filtroStatusAvancado,
    filtroValorMin,
    filtroValorMax,
    sortKey,
    sortDir,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
          <p className="mt-1 text-sm text-gray-500">Gerencie todas as suas transações financeiras</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setModalFiltros(true)} className="btn-secondary">
            <IconFiltro className="h-4 w-4" />
            Filtros Avançados
          </button>
          <button type="button" onClick={abrirNova} className="btn-primary">
            <IconPlus className="h-4 w-4" />
            Nova Transação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard titulo="Saldo" valor={resumo.saldo} tom={resumo.saldo >= 0 ? 'positivo' : 'negativo'} icon={IconWallet} />
        <SummaryCard
          titulo="Receitas"
          valor={resumo.receitas}
          tom="positivo"
          icon={IconTrendUp}
          footer={
            resumo.receitasPendentes > 0 ? (
              <span className="inline-flex items-center rounded-full bg-positive/10 px-2.5 py-1 text-xs font-medium text-positive">
                +{formatCurrency(resumo.receitasPendentes)}
              </span>
            ) : undefined
          }
        />
        <SummaryCard
          titulo="Despesas"
          valor={resumo.despesas}
          tom="negativo"
          icon={IconTrendDown}
          footer={
            resumo.despesasPendentes > 0 ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                +{formatCurrency(resumo.despesasPendentes)}
              </span>
            ) : undefined
          }
        />
        <SummaryCard titulo="Despesas Pendentes" valor={resumo.despesasPendentes} icon={IconRelogio} />
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {seletorMes}
          <button type="button" onClick={() => setVisao((v) => (v === 'lista' ? 'faturas' : 'lista'))} className="btn-secondary">
            <IconCartao className="h-4 w-4" />
            {visao === 'lista' ? 'Faturas' : 'Ver lista'}
          </button>
        </div>

        {visao === 'lista' && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as StatusFiltro)}
              className="input-field w-auto"
            >
              <option value="todas">Todas</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <button
                type="button"
                role="switch"
                aria-checked={!porRegistro}
                onClick={alternarDataBase}
                className={cn(
                  'relative h-5 w-9 shrink-0 overflow-hidden rounded-full transition-colors',
                  !porRegistro ? 'bg-brand-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={cn(
                    'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                    !porRegistro && 'translate-x-4'
                  )}
                />
              </button>
              Data Pagamento
            </label>

            <div className="relative min-w-[200px] flex-1">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar transações..."
                className="input-field pl-9"
              />
            </div>
          </div>
        )}
      </div>

      {visao === 'faturas' ? (
        <FaturasView transacoes={transacoes} cartoes={cartoes} />
      ) : transacoesFiltradas.length === 0 ? (
        <EmptyState mensagem="Nenhuma transação encontrada para os filtros selecionados." />
      ) : (
        <div className="card overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-3 py-3 font-medium">
                  <button type="button" onClick={() => ordenarPor('registro')} className="flex items-center gap-1 hover:text-gray-600">
                    Registro <IconOrdenar className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3 font-medium">Descrição</th>
                <th className="px-3 py-3 font-medium">Categoria</th>
                <th className="px-3 py-3 font-medium">Conta</th>
                <th className="px-3 py-3 font-medium">Cartão</th>
                <th className="px-3 py-3 text-right font-medium">
                  <button type="button" onClick={() => ordenarPor('valor')} className="ml-auto flex items-center gap-1 hover:text-gray-600">
                    Valor <IconOrdenar className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">
                  <button type="button" onClick={() => ordenarPor('pagamento')} className="flex items-center gap-1 hover:text-gray-600">
                    Pagamento <IconOrdenar className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transacoesFiltradas.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-3 py-3 text-gray-500">{formatDate(t.criado_em)}</td>
                  <td className="px-3 py-3 text-gray-800">
                    <p>{t.descricao}</p>
                    {t.parcela_total ? (
                      <p className="text-xs text-gray-400">Parcela {t.parcela_atual}/{t.parcela_total}</p>
                    ) : t.recorrente ? (
                      <p className="text-xs font-medium text-brand-600">Recorrente</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    {t.categoriaNome && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ backgroundColor: `${t.categoriaCor ?? '#888888'}1a`, color: t.categoriaCor ?? '#888888' }}
                      >
                        {t.categoriaNome}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-500">{t.contaNome ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-500">{t.cartaoNome ?? '—'}</td>
                  <td className={cn('px-3 py-3 text-right font-medium', t.tipo === 'receita' ? 'text-positive' : 'text-negative')}>
                    {t.tipo === 'receita' ? '+' : '-'} {formatCurrency(Math.abs(t.valor))}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => alternarPagoTransacao(t.id, !t.pago)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        t.pago ? 'bg-positive/10 text-positive' : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {t.pago ? 'Pago' : 'Pendente'}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{formatDate(t.data)}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(t)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Editar"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <DeleteButton action={() => excluirTransacao(t.id)} confirmMessage="Excluir esta transação?" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalForm} onClose={() => setModalForm(false)} title={editando ? 'Editar Transação' : 'Nova Transação'}>
        <TransacaoForm
          action={editando ? atualizarTransacao.bind(null, editando.id) : criarTransacao}
          categorias={categorias}
          subcategorias={subcategorias}
          contas={contas}
          cartoes={cartoes}
          transacao={editando}
          onSucesso={() => setModalForm(false)}
        />
      </Modal>

      <Modal open={modalFiltros} onClose={() => setModalFiltros(false)} title="Filtros Avançados" wide>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="label-field">Período</label>
              <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)} className="input-field">
                {OPCOES_PERIODO.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <MultiSelectFiltro
              label="Categoria"
              placeholder="Selecionar categorias"
              options={categorias.map((c) => ({ value: c.id, label: c.nome, cor: c.cor, icone: c.icone }))}
              selected={filtroCategorias}
              onChange={setFiltroCategorias}
            />

            <MultiSelectFiltro
              label="Subcategoria"
              placeholder="Selecionar subcategorias"
              options={subcategorias.map((s) => ({ value: s.id, label: s.nome }))}
              selected={filtroSubcategorias}
              onChange={setFiltroSubcategorias}
            />

            <MultiSelectFiltro
              label="Conta"
              placeholder="Selecionar contas"
              options={contas.map((c) => ({ value: c.id, label: c.nome, cor: c.cor }))}
              selected={filtroContas}
              onChange={setFiltroContas}
            />

            <MultiSelectFiltro
              label="Cartão de Crédito"
              placeholder="Selecionar cartões"
              options={cartoes.map((c) => ({ value: c.id, label: c.nome }))}
              selected={filtroCartoes}
              onChange={setFiltroCartoes}
            />

            <MultiSelectFiltro
              label="Status"
              placeholder="Selecionar status"
              options={[
                { value: 'pago', label: 'Pago' },
                { value: 'pendente', label: 'Pendente' },
              ]}
              selected={filtroStatusAvancado}
              onChange={setFiltroStatusAvancado}
            />

            <div>
              <label className="label-field">Faixa de Valor</label>
              <div className="space-y-2">
                <input
                  type="number"
                  value={filtroValorMin}
                  onChange={(e) => setFiltroValorMin(e.target.value)}
                  placeholder="Valor mínimo"
                  className="input-field"
                />
                <input
                  type="number"
                  value={filtroValorMax}
                  onChange={(e) => setFiltroValorMax(e.target.value)}
                  placeholder="Valor máximo"
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={somenteRecorrentes}
                onChange={(e) => setSomenteRecorrentes(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Apenas transações recorrentes
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={somenteParceladas}
                onChange={(e) => setSomenteParceladas(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Apenas compras parceladas
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" onClick={limparFiltrosAvancados} className="btn-secondary">
              Limpar Filtros
            </button>
            <button type="button" onClick={() => setModalFiltros(false)} className="btn-primary">
              Aplicar Filtros
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
