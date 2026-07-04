'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconEdit } from '@/components/icons';
import { CategoriaForm } from '@/components/cadastro/CategoriaForm';
import { SubcategoriaForm } from '@/components/cadastro/SubcategoriaForm';
import {
  criarCategoria,
  atualizarCategoria,
  excluirCategoria,
  criarSubcategoria,
  atualizarSubcategoria,
  excluirSubcategoria,
} from '@/app/(dashboard)/cadastro/actions';
import type { Categoria, Subcategoria } from '@/types/database';

export function CategoriasSection({
  categorias,
  subcategorias,
}: {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Categoria | undefined>(undefined);

  const [modalSubcategoria, setModalSubcategoria] = useState(false);
  const [categoriaAlvo, setCategoriaAlvo] = useState<Categoria | undefined>(undefined);
  const [subcategoriaEditando, setSubcategoriaEditando] = useState<Subcategoria | undefined>(undefined);

  const receitas = categorias.filter((c) => c.tipo === 'receita');
  const despesas = categorias.filter((c) => c.tipo === 'despesa');

  function subcategoriasDe(categoriaId: string) {
    return subcategorias.filter((s) => s.categoria_id === categoriaId);
  }

  function abrirNovaSubcategoria(categoria: Categoria) {
    setCategoriaAlvo(categoria);
    setSubcategoriaEditando(undefined);
    setModalSubcategoria(true);
  }

  function abrirEdicaoSubcategoria(categoria: Categoria, subcategoria: Subcategoria) {
    setCategoriaAlvo(categoria);
    setSubcategoriaEditando(subcategoria);
    setModalSubcategoria(true);
  }

  function Lista({ titulo, itens }: { titulo: string; itens: Categoria[] }) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase text-gray-400">{titulo}</h3>
        {itens.length === 0 ? (
          <EmptyState mensagem={`Nenhuma categoria de ${titulo.toLowerCase()}.`} />
        ) : (
          <div className="card divide-y divide-gray-50">
            {itens.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
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

                <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-5">
                  {subcategoriasDe(c.id).map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 pl-2.5 pr-1 text-xs text-gray-600"
                    >
                      <button type="button" onClick={() => abrirEdicaoSubcategoria(c, s)} className="hover:text-gray-900">
                        {s.nome}
                      </button>
                      <DeleteButton
                        action={() => excluirSubcategoria(s.id)}
                        confirmMessage="Excluir esta subcategoria?"
                      />
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => abrirNovaSubcategoria(c)}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                  >
                    <IconPlus className="h-3 w-3" />
                    Subcategoria
                  </button>
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

      <Modal
        open={modalSubcategoria}
        onClose={() => setModalSubcategoria(false)}
        title={subcategoriaEditando ? 'Editar subcategoria' : 'Nova subcategoria'}
      >
        {categoriaAlvo && (
          <SubcategoriaForm
            action={
              subcategoriaEditando
                ? atualizarSubcategoria.bind(null, subcategoriaEditando.id)
                : criarSubcategoria
            }
            categoriaId={categoriaAlvo.id}
            subcategoria={subcategoriaEditando}
            onSucesso={() => setModalSubcategoria(false)}
          />
        )}
      </Modal>
    </div>
  );
}
