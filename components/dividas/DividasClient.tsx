'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Abertura, Pilulas, botaoAbertura } from '@/components/ui/Abertura';
import { Anel } from '@/components/estoque/ui';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  IconPlus,
  IconEdit,
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
import type { Divida, Categoria, Subcategoria, Conta } from '@/types/database';

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
  if (d.data_vencimento && d.data_vencimento < hoje) return 'vencida';
  if (Number(d.valor_pago) > 0) return 'parcial';
  return 'pendente';
}

const SITUACAO_LABEL: Record<'ativa' | 'standby', string> = {
  ativa: 'Ativa',
  standby: 'Em standby',
};

export function DividasClient({
  dividas,
  categorias,
  subcategorias,
  contas,
}: {
  dividas: Divida[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
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
  const dividasVencidas = ativas.filter((d) => d.data_vencimento && d.data_vencimento < hoje).length;
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

  const pagoAtivas = ativas.reduce((a, d) => a + Number(d.valor_pago), 0);
  const conta = (st: StatusChave) => dividas.filter((d) => statusDivida(d, hoje) === st).length;
  const proximaVenc = ativas
    .filter((d) => d.data_vencimento && d.data_vencimento >= hoje)
    .sort((a, b) => (a.data_vencimento ?? '').localeCompare(b.data_vencimento ?? ''))[0];

  return (
    <div className="space-y-5">
      <Abertura
        cor="rosa"
        sobretitulo="Controle de dívidas"
        titulo={formatCurrency(restanteAPagar)}
        subtitulo={ativas.length ? `restante a pagar de ${formatCurrency(totalDividas)} em ${ativas.length} dívida(s) ativa(s)` : 'Nenhuma dívida ativa 🎉'}
        anel={{ pct: totalDividas ? (pagoAtivas / totalDividas) * 100 : 100, rotulo: 'já pago' }}
        cartoes={[
          { rotulo: '⚠️ Vencidas', valor: dividasVencidas, sub: dividasVencidas ? 'precisam de atenção' : 'nenhuma vencida', alerta: dividasVencidas > 0, onClick: () => setFiltroStatus('vencida') },
          { rotulo: '📆 Parcelas por mês', valor: formatCurrency(pagamentosMensais), sub: 'estimativa mensal' },
          {
            rotulo: '⏰ Próximo vencimento',
            valor: proximaVenc ? proximaVenc.descricao : '—',
            sub: proximaVenc?.data_vencimento ? formatDate(proximaVenc.data_vencimento) : 'sem vencimento próximo',
          },
          { rotulo: '✅ Quitadas', valor: conta('quitada'), sub: 'dívidas encerradas', onClick: () => setFiltroStatus('quitada') },
        ]}
        acoes={
          <button type="button" onClick={abrirNova} className={botaoAbertura.principal}>
            <IconPlus className="h-4 w-4" /> Nova dívida
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Pilulas
          valor={filtroStatus}
          onChange={setFiltroStatus}
          opcoes={[
            { id: 'todos', rotulo: 'Todas', n: dividas.length },
            { id: 'vencida', rotulo: 'Vencidas', n: conta('vencida'), ponto: 'bg-red-500' },
            { id: 'pendente', rotulo: 'Pendentes', n: conta('pendente'), ponto: 'bg-gray-400' },
            { id: 'parcial', rotulo: 'Parciais', n: conta('parcial'), ponto: 'bg-brand-500' },
            { id: 'quitada', rotulo: 'Quitadas', n: conta('quitada'), ponto: 'bg-emerald-500' },
          ]}
        />
        <div className="relative sm:ml-auto sm:w-64">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar dívidas..." className="input-field pl-9" />
        </div>
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
              <div
                key={d.id}
                className={cn(
                  'card flex flex-col border-l-4 p-4 transition hover:-translate-y-0.5 hover:shadow-elevated',
                  status === 'vencida' ? 'border-l-red-500' : status === 'quitada' ? 'border-l-emerald-500' : status === 'parcial' ? 'border-l-brand-500' : 'border-l-gray-300'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{d.descricao}</p>
                    {d.credor && <p className="text-xs text-gray-400">{d.credor}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', STATUS_ESTILO[status])}>
                      {STATUS_LABEL[status]}
                    </span>
                    {d.situacao === 'standby' && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        {SITUACAO_LABEL.standby}
                      </span>
                    )}
                  </div>
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

                <div className="mt-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                      <span>Pago {formatCurrency(Number(d.valor_pago))}</span>
                    </div>
                    <ProgressBar percentual={percentualPago} tom={quitada ? 'positive' : 'brand'} />
                  </div>
                  <Anel pct={Math.min(100, percentualPago)} tamanho={48} espessura={5} cor={quitada ? '#059669' : status === 'vencida' ? '#ef4444' : '#3b82f6'} fundo="#eef0f4">
                    <span className="text-[10px] font-bold tabular-nums text-gray-800">{Math.round(percentualPago)}%</span>
                  </Anel>
                </div>

                <p
                  className={cn(
                    'mt-3 flex items-center gap-1.5 text-xs',
                    status === 'vencida' ? 'text-negative' : 'text-gray-400'
                  )}
                >
                  <IconCalendario className="h-3.5 w-3.5" />
                  {d.sem_vencimento || !d.data_vencimento
                    ? 'Sem vencimento definido'
                    : `Vencimento: ${formatDate(d.data_vencimento)}`}
                </p>

                {d.observacoes && (
                  <p className="mt-2 line-clamp-2 text-xs italic text-gray-400">{d.observacoes}</p>
                )}

                <div className="mt-auto flex gap-2 pt-4">
                  {!quitada && (
                    <button type="button" onClick={() => abrirPagamento(d)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
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
          subcategorias={subcategorias}
          contas={contas}
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
