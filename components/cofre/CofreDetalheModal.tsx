'use client';

import { Modal } from '@/components/ui/Modal';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconEdit, IconDepositar, IconRetirar, IconCadeado } from '@/components/icons';
import { excluirCofre, excluirMovimentacaoCofre } from '@/app/(dashboard)/cofre/actions';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { CofreSeguro } from '@/components/cofre/types';
import type { CofreMovimentacao, TipoMovimentacaoCofre } from '@/types/database';

export function CofreDetalheModal({
  open,
  cofre,
  historico,
  onClose,
  onEditar,
  onMovimentar,
  onExcluido,
}: {
  open: boolean;
  cofre: CofreSeguro | undefined;
  historico: CofreMovimentacao[];
  onClose: () => void;
  onEditar: (cofre: CofreSeguro) => void;
  onMovimentar: (cofre: CofreSeguro, tipo: TipoMovimentacaoCofre) => void;
  onExcluido: () => void;
}) {
  if (!cofre) return null;

  return (
    <Modal open={open} onClose={onClose} title={cofre.nome} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4">
          <div>
            <p className="text-xs text-gray-400">Saldo guardado</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(Number(cofre.saldo))}</p>
            {cofre.descricao && <p className="mt-1 text-sm text-gray-500">{cofre.descricao}</p>}
          </div>
          {cofre.protegido && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              <IconCadeado className="h-3.5 w-3.5" />
              Protegido por senha
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onMovimentar(cofre, 'deposito')} className="btn-secondary flex-1">
            <IconDepositar className="h-4 w-4" />
            Depositar
          </button>
          <button
            type="button"
            onClick={() => onMovimentar(cofre, 'retirada')}
            disabled={Number(cofre.saldo) <= 0}
            className="btn-secondary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconRetirar className="h-4 w-4" />
            Retirar
          </button>
          <button type="button" onClick={() => onEditar(cofre)} className="btn-secondary">
            <IconEdit className="h-4 w-4" />
            Editar
          </button>
          <DeleteButton
            action={async () => {
              await excluirCofre(cofre.id);
              onExcluido();
            }}
            confirmMessage="Excluir este cofre e todo o histórico de movimentações?"
          />
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-700">Histórico de movimentações</h4>
          {historico.length === 0 ? (
            <EmptyState mensagem="Nenhuma movimentação registrada ainda." />
          ) : (
            <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
              {historico.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">
                      {m.descricao || (m.tipo === 'deposito' ? 'Depósito' : 'Retirada')}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(m.data)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn('font-semibold', m.tipo === 'deposito' ? 'text-positive' : 'text-negative')}>
                      {m.tipo === 'deposito' ? '+' : '-'} {formatCurrency(Number(m.valor))}
                    </span>
                    <DeleteButton
                      action={() => excluirMovimentacaoCofre(m.id, cofre.id)}
                      confirmMessage="Excluir esta movimentação?"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
