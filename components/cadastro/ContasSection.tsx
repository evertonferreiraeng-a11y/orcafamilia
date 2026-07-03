'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconEdit } from '@/components/icons';
import { ContaForm } from '@/components/cadastro/ContaForm';
import { criarConta, atualizarConta, excluirConta } from '@/app/(dashboard)/cadastro/actions';
import { formatCurrency } from '@/lib/utils';
import type { Conta } from '@/types/database';

export function ContasSection({ contas }: { contas: Conta[] }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Conta | undefined>(undefined);

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
          Nova conta
        </button>
      </div>

      {contas.length === 0 ? (
        <EmptyState mensagem="Nenhuma conta cadastrada." />
      ) : (
        <div className="card divide-y divide-gray-50">
          {contas.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full" style={{ backgroundColor: c.cor ?? '#2a78d6' }} />
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                  <p className="text-xs capitalize text-gray-400">{c.tipo} • Saldo inicial: {formatCurrency(Number(c.saldo_inicial))}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditando(c);
                    setModalAberto(true);
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Editar"
                >
                  <IconEdit className="h-4 w-4" />
                </button>
                <DeleteButton action={() => excluirConta(c.id)} confirmMessage="Excluir esta conta?" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar conta' : 'Nova conta'}>
        <ContaForm
          action={editando ? atualizarConta.bind(null, editando.id) : criarConta}
          conta={editando}
          onSucesso={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  );
}
