'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconEdit } from '@/components/icons';
import { CategoriaForm } from '@/components/cadastro/CategoriaForm';
import { criarCategoria, atualizarCategoria, excluirCategoria } from '@/app/(dashboard)/cadastro/actions';
import type { Categoria } from '@/types/database';

export function CategoriasSection({ categorias }: { categorias: Categoria[] }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Categoria | undefined>(undefined);

  const receitas = categorias.filter((c) => c.tipo === 'receita');
  const despesas = categorias.filter((c) => c.tipo === 'despesa');

  function Lista({ titulo, itens }: { titulo: string; itens: Categoria[] }) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase text-gray-400">{titulo}</h3>
        {itens.length === 0 ? (
          <EmptyState mensagem={`Nenhuma categoria de ${titulo.toLowerCase()}.`} />
        ) : (
          <div className="card divide-y divide-gray-50">
            {itens.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.cor ?? '#888888' }} />
                  <p className="text-sm font-medium text-gray-800">{c.nome}</p>
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
                  <DeleteButton action={() => excluirCategoria(c.id)} confirmMessage="Excluir esta categoria?" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

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
          Nova categoria
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Lista titulo="Receitas" itens={receitas} />
        <Lista titulo="Despesas" itens={despesas} />
      </div>

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar categoria' : 'Nova categoria'}>
        <CategoriaForm
          action={editando ? atualizarCategoria.bind(null, editando.id) : criarCategoria}
          categoria={editando}
          onSucesso={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  );
}
