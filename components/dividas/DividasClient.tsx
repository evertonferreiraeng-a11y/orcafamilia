'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconEdit } from '@/components/icons';
import { DividaForm } from '@/components/dividas/DividaForm';
import { PagamentoForm } from '@/components/dividas/PagamentoForm';
import {
  criarDivida,
  atualizarDivida,
  registrarPagamentoDivida,
  excluirDivida,
} from '@/app/(dashboard)/dividas/actions';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Divida } from '@/types/database';

export function DividasClient({ dividas }: { dividas: Divida[] }) {
  const [modalForm, setModalForm] = useState(false);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [selecionada, setSelecionada] = useState<Divida | undefined>(undefined);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={abrirNova} className="btn-primary">
          <IconPlus className="h-4 w-4" />
          Nova dívida
        </button>
      </div>

      {dividas.length === 0 ? (
        <EmptyState mensagem="Nenhuma dívida cadastrada." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dividas.map((d) => {
            const saldoDevedor = Number(d.valor_total) - Number(d.valor_pago);
            const percentualPago = (Number(d.valor_pago) / Number(d.valor_total)) * 100;
            const quitada = d.status === 'quitada';

            return (
              <div key={d.id} className="card p-5">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{d.descricao}</p>
                    {d.credor && <p className="text-xs text-gray-400">{d.credor}</p>}
                  </div>
                  <div className="flex gap-1">
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

                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                    quitada ? 'bg-green-50 text-positive' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {quitada ? 'Quitada' : 'Ativa'}
                </span>

                <div className="mt-3 space-y-1 text-sm">
                  <p className="text-gray-500">
                    Pago: <span className="font-medium text-gray-800">{formatCurrency(Number(d.valor_pago))}</span> de{' '}
                    {formatCurrency(Number(d.valor_total))}
                  </p>
                  <p className="text-gray-500">
                    Saldo devedor: <span className="font-semibold text-negative">{formatCurrency(saldoDevedor)}</span>
                  </p>
                  {d.parcelas_total && (
                    <p className="text-gray-500">Parcelas: {d.parcelas_pagas ?? 0}/{d.parcelas_total}</p>
                  )}
                  <p className="text-gray-500">Próximo vencimento: {formatDate(d.data_vencimento)}</p>
                </div>

                <div className="mt-3">
                  <ProgressBar percentual={percentualPago} tom="brand" />
                </div>

                {!quitada && (
                  <button
                    type="button"
                    onClick={() => abrirPagamento(d)}
                    className="btn-secondary mt-4 w-full"
                  >
                    Registrar pagamento
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalForm} onClose={() => setModalForm(false)} title={selecionada ? 'Editar dívida' : 'Nova dívida'}>
        <DividaForm
          action={selecionada ? atualizarDivida.bind(null, selecionada.id) : criarDivida}
          divida={selecionada}
          onSucesso={() => setModalForm(false)}
        />
      </Modal>

      <Modal open={modalPagamento} onClose={() => setModalPagamento(false)} title="Registrar pagamento">
        {selecionada && (
          <PagamentoForm
            action={registrarPagamentoDivida.bind(null, selecionada.id)}
            saldoDevedor={Number(selecionada.valor_total) - Number(selecionada.valor_pago)}
            onSucesso={() => setModalPagamento(false)}
          />
        )}
      </Modal>
    </div>
  );
}
