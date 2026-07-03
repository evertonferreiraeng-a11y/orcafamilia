'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconEdit } from '@/components/icons';
import { MetaForm } from '@/components/metas/MetaForm';
import { AporteForm } from '@/components/metas/AporteForm';
import { criarMeta, atualizarMeta, registrarAporteMeta, excluirMeta } from '@/app/(dashboard)/metas/actions';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Meta } from '@/types/database';

export function MetasClient({ metas }: { metas: Meta[] }) {
  const [modalForm, setModalForm] = useState(false);
  const [modalAporte, setModalAporte] = useState(false);
  const [selecionada, setSelecionada] = useState<Meta | undefined>(undefined);

  function abrirNova() {
    setSelecionada(undefined);
    setModalForm(true);
  }

  function abrirEdicao(m: Meta) {
    setSelecionada(m);
    setModalForm(true);
  }

  function abrirAporte(m: Meta) {
    setSelecionada(m);
    setModalAporte(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={abrirNova} className="btn-primary">
          <IconPlus className="h-4 w-4" />
          Nova meta
        </button>
      </div>

      {metas.length === 0 ? (
        <EmptyState mensagem="Nenhuma meta cadastrada." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metas.map((m) => {
            const percentual = (Number(m.valor_atual) / Number(m.valor_alvo)) * 100;
            const concluida = percentual >= 100;

            return (
              <div key={m.id} className="card p-5">
                <div className="mb-2 flex items-start justify-between">
                  <p className="font-medium text-gray-900">{m.nome}</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(m)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      aria-label="Editar"
                    >
                      <IconEdit className="h-4 w-4" />
                    </button>
                    <DeleteButton action={() => excluirMeta(m.id)} confirmMessage="Excluir esta meta?" />
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  {formatCurrency(Number(m.valor_atual))} de {formatCurrency(Number(m.valor_alvo))}
                </p>

                <div className="mt-2">
                  <ProgressBar percentual={percentual} tom="brand" />
                </div>

                <p className={`mt-2 text-xs font-medium ${concluida ? 'text-positive' : 'text-gray-400'}`}>
                  {percentual.toFixed(0)}% concluída{concluida ? ' — meta atingida' : ''}
                </p>

                {m.data_alvo && <p className="mt-1 text-xs text-gray-400">Até {formatDate(m.data_alvo)}</p>}

                {!concluida && (
                  <button type="button" onClick={() => abrirAporte(m)} className="btn-secondary mt-4 w-full">
                    Registrar aporte
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalForm} onClose={() => setModalForm(false)} title={selecionada ? 'Editar meta' : 'Nova meta'}>
        <MetaForm
          action={selecionada ? atualizarMeta.bind(null, selecionada.id) : criarMeta}
          meta={selecionada}
          onSucesso={() => setModalForm(false)}
        />
      </Modal>

      <Modal open={modalAporte} onClose={() => setModalAporte(false)} title="Registrar aporte">
        {selecionada && (
          <AporteForm action={registrarAporteMeta.bind(null, selecionada.id)} onSucesso={() => setModalAporte(false)} />
        )}
      </Modal>
    </div>
  );
}
