'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconEdit } from '@/components/icons';
import { InvestimentoForm } from '@/components/cadastro/InvestimentoForm';
import { criarInvestimento, atualizarInvestimento, excluirInvestimento } from '@/app/(dashboard)/cadastro/actions';
import { formatCurrency, cn } from '@/lib/utils';
import type { Investimento } from '@/types/database';

export function InvestimentosSection({ investimentos }: { investimentos: Investimento[] }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Investimento | undefined>(undefined);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setEditando(undefined);
            setModalAberto(true);
          }}
          className="btn-primary"
        >
          <IconPlus className="h-4 w-4" />
          Novo investimento
        </button>
      </div>

      {investimentos.length === 0 ? (
        <EmptyState mensagem="Nenhum investimento cadastrado." />
      ) : (
        <div className="card divide-y divide-gray-50">
          {investimentos.map((i) => {
            const rentabilidade = Number(i.valor_atual) - Number(i.valor_investido);
            return (
              <div key={i.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{i.nome}</p>
                  <p className="text-xs capitalize text-gray-400">
                    {i.tipo?.replace('_', ' ') ?? 'outro'} {i.instituicao ? `• ${i.instituicao}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(Number(i.valor_atual))}</p>
                  <p className={cn('text-xs', rentabilidade >= 0 ? 'text-positive' : 'text-negative')}>
                    {rentabilidade >= 0 ? '+' : ''}
                    {formatCurrency(rentabilidade)}
                  </p>
                </div>
                <div className="ml-3 flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(i);
                      setModalAberto(true);
                    }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Editar"
                  >
                    <IconEdit className="h-4 w-4" />
                  </button>
                  <DeleteButton action={() => excluirInvestimento(i.id)} confirmMessage="Excluir este investimento?" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editando ? 'Editar investimento' : 'Novo investimento'}
      >
        <InvestimentoForm
          action={editando ? atualizarInvestimento.bind(null, editando.id) : criarInvestimento}
          investimento={editando}
          onSucesso={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  );
}
