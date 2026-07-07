'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconSearch } from '@/components/icons';
import { MetaForm } from '@/components/metas/MetaForm';
import { MetaCard } from '@/components/metas/MetaCard';
import { criarMeta, atualizarMeta } from '@/app/(dashboard)/metas/actions';
import type { Meta } from '@/types/database';

type StatusFiltro = 'todas' | 'ativa' | 'concluida';

export function MetasClient({ metas }: { metas: Meta[] }) {
  const [modalForm, setModalForm] = useState(false);
  const [selecionada, setSelecionada] = useState<Meta | undefined>(undefined);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todas');

  function abrirNova() {
    setSelecionada(undefined);
    setModalForm(true);
  }

  function abrirEdicao(m: Meta) {
    setSelecionada(m);
    setModalForm(true);
  }

  const metasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return metas.filter((m) => {
      const concluida = Number(m.valor_atual) >= Number(m.valor_alvo);
      if (filtroStatus === 'ativa' && concluida) return false;
      if (filtroStatus === 'concluida' && !concluida) return false;
      if (!termo) return true;
      return m.nome.toLowerCase().includes(termo) || (m.descricao ?? '').toLowerCase().includes(termo);
    });
  }, [metas, busca, filtroStatus]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vision Board - Metas</h1>
          <p className="mt-1 text-sm text-gray-500">Visualize e acompanhe suas metas financeiras</p>
        </div>
        <button type="button" onClick={abrirNova} className="btn-primary">
          <IconPlus className="h-4 w-4" />
          Adicionar Meta
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar metas..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusFiltro)}
          className="input-field sm:w-48"
        >
          <option value="todas">Todas</option>
          <option value="ativa">Ativa</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>

      {metasFiltradas.length === 0 ? (
        <EmptyState mensagem={metas.length === 0 ? 'Nenhuma meta cadastrada.' : 'Nenhuma meta encontrada.'} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metasFiltradas.map((m) => (
            <MetaCard key={m.id} meta={m} onEditar={() => abrirEdicao(m)} />
          ))}
        </div>
      )}

      <Modal open={modalForm} onClose={() => setModalForm(false)} title={selecionada ? 'Editar meta' : 'Nova meta'}>
        <MetaForm
          action={selecionada ? atualizarMeta.bind(null, selecionada.id) : criarMeta}
          meta={selecionada}
          onSucesso={() => setModalForm(false)}
        />
      </Modal>
    </div>
  );
}
