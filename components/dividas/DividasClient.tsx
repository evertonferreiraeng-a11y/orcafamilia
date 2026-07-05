'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  IconPlus,
  IconEdit,
  IconLandmark,
  IconTrendDown,
  IconAlerta,
  IconCalendario,
  IconSearch,
  IconCartao,
} from '@/components/icons';
import { DividaForm } from '@/components/dividas/DividaForm';
import { PagamentoForm } from '@/components/dividas/PagamentoForm';
import {
  criarDivida,
  atualizarDivida,
  registrarPagamentoDivida,
  excluirDivida,
} from '@/app/(dashboard)/dividas/actions';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Divida, Categoria, Conta } from '@/types/database';

type StatusChave = 'pendente' | 'parcial' | 'vencida' | 'quitada';
type StatusFiltro = 'todos' | StatusChave;

const STATUS_LABEL: Record<StatusChave, string> = {
  pendente: 'Pendente',
  parcial: 'Parcial',
  vencida: 'Vencida',
  quitada: 'Quitada',
};

const STATUS_ESTILO: Record<StatusChave, string> = {
  quitada: 'bg-positive/10 text-positive',
  vencida: 'bg-negative/10 text-negative',
  parcial: 'bg-brand-50 text-brand-600',
  pendente: 'bg-gray-100 text-gray-600',
};

function statusDivida(d: Divida, hoje: string): StatusChave {
  if (d.status === 'quitada') return 'quitada';
  if (d.data_vencimento < hoje) return 'vencida';
  if (Number(d.valor_pago) > 0) return 'parcial';
  return 'pendente';
}

export function DividasClient({
  dividas,
  categorias,
  contas,
}: {
  dividas: Divida[];
  categorias: Categoria[];
  contas: Conta[];
}) {
  const [modalForm, setModalForm] = useState(false);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [selecionada, setSelecionada] = useState<Divida | undefined>(undefined);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todos');

  const hoje = new Date().toISOString().slice(0, 10);

  function abrirNova() {
    setSelecionada(undefined);
    setModalForm(true);
  }

  function abrirEdicao(d: Divida) {
    setSelecionada(d);
    setModalForm(true);
  }

  function abrirPagamento(d: Divida) {
    setSelecionada(d);
    setModalPagamento(true);
  }

  const ativas = dividas.filter((d) => d.status === 'ativa');
  const totalDividas = ativas.reduce((a, d) => a + Number(d.valor_total), 0);
  const restanteAPagar = ativas.reduce((a, d) => a + (Number(d.valor_total) - Number(d.valor_pago)), 0);
  const dividasVencidas = ativas.filter((d) => d.data_vencimento < hoje).length;
  const pagamentosMensais = ativas.reduce((a, d) => {
    if (!d.parcelas_total) return a;
    return a + Number(d.valor_total) / d.parcelas_total;
  }, 0);

  const dividasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return dividas.filter((d) => {
      if (filtroStatus !== 'todos' && statusDivida(d, hoje) !== filtroStatus) return false;
      if (!termo) return true;
      return d.descricao.toLowerCase().includes(termo) || (d.credor ?? '').toLowerCase().includes(termo);
    });
  }, [dividas, busca, filtroStatus, hoje]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Dívidas</h1>
          <p className="mt-1 text-sm text-gray-500">Gerencie suas dívidas e acompanhe os pagamentos</p>
        </div>
        <button type="button" onClick={abrirNova} className="btn-primary">
          <IconPlus className="h-4 w-4" />
          Nova dívida
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          titulo="Total em Dívidas"
          valor={totalDividas}
          tom="negativo"
          subtitulo="Valor total devendo"
          icon={IconLandmark}
        />
        <SummaryCard
          titulo="Restante a Pagar"
          valor={restanteAPagar}
          tom="negativo"
          subtitulo="Ainda precisa ser pago"
          icon={IconTrendDown}
        />
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <IconAlerta className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-gray-500">Dívidas Vencidas</p>
          </div>
          <p className={cn('mt-4 text-xl font-bold', dividasVencidas > 0 ? 'text-negative' : 'text-gray-900')}>
            {dividasVencidas}
          </p>
          <p className="mt-1 text-xs text-gray-400">Precisam de atenção</p>
        </div>
        <SummaryCard
          titulo="Pagamentos Mensais"
          valor={pagamentosMensais}
          subtitulo="Estimativa mensal"
          icon={IconCalendario}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar dívidas..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusFiltro)}
          className="input-field sm:w-48"
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="parcial">Parcial</option>
          <option value="vencida">Vencida</option>
          <option value="quitada">Quitada</option>
        </select>
      </div>

      {dividasFiltradas.length === 0 ? (
        <EmptyState mensagem={dividas.length === 0 ? 'Nenhuma dívida cadastrada.' : 'Nenhuma dívida encontrada.'} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dividasFiltradas.map((d) => {
            const saldoDevedor = Number(d.valor_total) - Number(d.valor_pago);
            const percentualPago = (Number(d.valor_pago) / Number(d.valor_total)) * 100;
            const quitada = d.status === 'quitada';
            const status = statusDivida(d, hoje);

            return (
              <div key={d.id} className="card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{d.descricao}</p>
                    {d.credor && <p className="text-xs text-gray-400">{d.credor}</p>}
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_ESTILO[status])}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>

                {d.parcelas_total && (
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Dívida {d.parcelas_pagas ?? 0}/{d.parcelas_total}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-400">Total</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(Number(d.valor_total))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400">Restante</p>
                    <p className="font-semibold text-negative">{formatCurrency(saldoDevedor)}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                    <span>Progresso do pagamento</span>
                    <span className="font-medium text-gray-700">{percentualPago.toFixed(1)}%</span>
                  </div>
                  <ProgressBar percentual={percentualPago} tom="brand" />
                </div>

                <p
                  className={cn(
                    'mt-3 flex items-center gap-1.5 text-xs',
                    status === 'vencida' ? 'text-negative' : 'text-gray-400'
                  )}
                >
                  <IconCalendario className="h-3.5 w-3.5" />
                  Vencimento: {formatDate(d.data_vencimento)}
                </p>

                <div className="mt-4 flex gap-2">
                  {!quitada && (
                    <button type="button" onClick={() => abrirPagamento(d)} className="btn-secondary flex-1">
                      <IconCartao className="h-4 w-4" />
                      Pagar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => abrirEdicao(d)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Editar"
                  >
                    <IconEdit className="h-4 w-4" />
                  </button>
                  <DeleteButton action={() => excluirDivida(d.id)} confirmMessage="Excluir esta dívida?" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalForm} onClose={() => setModalForm(false)} title={selecionada ? 'Editar dívida' : 'Nova dívida'}>
        <DividaForm
          action={selecionada ? atualizarDivida.bind(null, selecionada.id) : criarDivida}
          divida={selecionada}
          categorias={categorias}
          onSucesso={() => setModalForm(false)}
        />
      </Modal>

      <Modal open={modalPagamento} onClose={() => setModalPagamento(false)} title="Registrar pagamento">
        {selecionada && (
          <PagamentoForm
            action={registrarPagamentoDivida.bind(null, selecionada.id)}
            saldoDevedor={Number(selecionada.valor_total) - Number(selecionada.valor_pago)}
            parcelaAtual={selecionada.parcelas_total ? (selecionada.parcelas_pagas ?? 0) + 1 : null}
            parcelasTotal={selecionada.parcelas_total}
            valorParcela={
              selecionada.parcelas_total ? Number(selecionada.valor_total) / selecionada.parcelas_total : null
            }
            dataVencimento={selecionada.data_vencimento}
            contas={contas}
            onSucesso={() => setModalPagamento(false)}
            onCancelar={() => setModalPagamento(false)}
          />
        )}
      </Modal>
    </div>
  );
}
