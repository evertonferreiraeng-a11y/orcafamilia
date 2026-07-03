'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconEdit } from '@/components/icons';
import { OrcamentoForm } from '@/components/orcamentos/OrcamentoForm';
import { criarOrcamento, atualizarOrcamento, excluirOrcamento } from '@/app/(dashboard)/orcamentos/actions';
import { formatCurrency } from '@/lib/utils';
import type { Categoria } from '@/types/database';

export interface OrcamentoComGasto {
  id: string;
  categoriaId: string;
  categoriaNome: string;
  categoriaCor: string | null;
  valorLimite: number;
  gasto: number;
}

export function OrcamentosClient({
  orcamentos,
  categoriasSemOrcamento,
  mesReferencia,
}: {
  orcamentos: OrcamentoComGasto[];
  categoriasSemOrcamento: Categoria[];
  mesReferencia: string;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<OrcamentoComGasto | undefined>(undefined);

  function abrirNovo() {
    setEditando(undefined);
    setModalAberto(true);
  }

  function abrirEdicao(o: OrcamentoComGasto) {
    setEditando(o);
    setModalAberto(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={abrirNovo}
          disabled={categoriasSemOrcamento.length === 0}
          className="btn-primary"
        >
          <IconPlus className="h-4 w-4" />
          Novo orçamento
        </button>
      </div>

      {orcamentos.length === 0 ? (
        <EmptyState mensagem="Nenhum orçamento definido para este mês." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orcamentos.map((o) => {
            const percentual = o.valorLimite > 0 ? (o.gasto / o.valorLimite) * 100 : 0;
            const estourado = percentual >= 100;
            const alerta = percentual >= 80;

            return (
              <div key={o.id} className="card p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ backgroundColor: `${o.categoriaCor ?? '#888888'}1a`, color: o.categoriaCor ?? '#888888' }}
                    >
                      {o.categoriaNome}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(o)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      aria-label="Editar"
                    >
                      <IconEdit className="h-4 w-4" />
                    </button>
                    <DeleteButton action={() => excluirOrcamento(o.id)} confirmMessage="Excluir este orçamento?" />
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  {formatCurrency(o.gasto)} de {formatCurrency(o.valorLimite)}
                </p>

                <div className="mt-2">
                  <ProgressBar percentual={percentual} />
                </div>

                <p
                  className={`mt-2 text-xs font-medium ${
                    estourado ? 'text-negative' : alerta ? 'text-amber-600' : 'text-gray-400'
                  }`}
                >
                  {percentual.toFixed(0)}% do orçamento
                  {estourado ? ' — orçamento estourado' : alerta ? ' — quase no limite' : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editando ? 'Editar orçamento' : 'Novo orçamento'}
      >
        <OrcamentoForm
          action={editando ? atualizarOrcamento.bind(null, editando.id) : criarOrcamento}
          categorias={categoriasSemOrcamento}
          mesReferencia={mesReferencia}
          valorLimiteAtual={editando?.valorLimite}
          categoriaFixa={editando ? { id: editando.categoriaId, nome: editando.categoriaNome } : undefined}
          onSucesso={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  );
}
