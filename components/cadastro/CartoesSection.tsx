'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconEdit } from '@/components/icons';
import { CartaoForm } from '@/components/cadastro/CartaoForm';
import { criarCartao, atualizarCartao, excluirCartao } from '@/app/(dashboard)/cadastro/actions';
import { formatCurrency } from '@/lib/utils';
import type { Cartao, Conta } from '@/types/database';

export function CartoesSection({ cartoes, contas }: { cartoes: Cartao[]; contas: Conta[] }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Cartao | undefined>(undefined);

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
          Novo cartão
        </button>
      </div>

      {cartoes.length === 0 ? (
        <EmptyState mensagem="Nenhum cartão cadastrado." />
      ) : (
        <div className="card divide-y divide-gray-50">
          {cartoes.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                <p className="text-xs text-gray-400">
                  {c.bandeira ?? 'Sem bandeira'} • Limite {formatCurrency(Number(c.limite))} • Fecha dia {c.dia_fechamento}, vence dia {c.dia_vencimento}
                </p>
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
                <DeleteButton action={() => excluirCartao(c.id)} confirmMessage="Excluir este cartão?" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar cartão' : 'Novo cartão'}>
        <CartaoForm
          action={editando ? atualizarCartao.bind(null, editando.id) : criarCartao}
          cartao={editando}
          contas={contas}
          onSucesso={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  );
}
