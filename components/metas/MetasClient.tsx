'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconSearch } from '@/components/icons';
import { Abertura, Pilulas, botaoAbertura } from '@/components/ui/Abertura';
import { formatCurrency, formatDate } from '@/lib/utils';
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

  const resumo = useMemo(() => {
    const alvo = metas.reduce((a, m) => a + Number(m.valor_alvo), 0);
    const atual = metas.reduce((a, m) => a + Math.min(Number(m.valor_atual), Number(m.valor_alvo)), 0);
    const concluidas = metas.filter((m) => Number(m.valor_atual) >= Number(m.valor_alvo)).length;
    const proxima = metas
      .filter((m) => m.data_alvo && Number(m.valor_atual) < Number(m.valor_alvo))
      .sort((a, b) => (a.data_alvo ?? '').localeCompare(b.data_alvo ?? ''))[0];
    return { alvo, atual, concluidas, ativas: metas.length - concluidas, proxima };
  }, [metas]);

  return (
    <div className="space-y-5">
      <Abertura
        cor="roxo"
        sobretitulo="Vision Board"
        titulo="Nossas metas"
        subtitulo={metas.length ? `${formatCurrency(resumo.atual)} guardados de ${formatCurrency(resumo.alvo)}` : 'Cadastre os sonhos da família e acompanhe cada aporte'}
        anel={{ pct: resumo.alvo ? (resumo.atual / resumo.alvo) * 100 : 0, rotulo: 'do total' }}
        cartoes={[
          { rotulo: '🎯 Ativas', valor: resumo.ativas, sub: 'em andamento', onClick: () => setFiltroStatus('ativa') },
          { rotulo: '🏆 Concluídas', valor: resumo.concluidas, sub: 'metas atingidas', onClick: () => setFiltroStatus('concluida') },
          { rotulo: '💰 Falta juntar', valor: formatCurrency(Math.max(0, resumo.alvo - resumo.atual)), sub: 'somando todas' },
          {
            rotulo: '📅 Próximo prazo',
            valor: resumo.proxima ? resumo.proxima.nome : '—',
            sub: resumo.proxima?.data_alvo ? formatDate(resumo.proxima.data_alvo) : 'sem prazo definido',
          },
        ]}
        acoes={
          <button type="button" onClick={abrirNova} className={botaoAbertura.principal}>
            <IconPlus className="h-4 w-4" /> Adicionar meta
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Pilulas
          valor={filtroStatus}
          onChange={setFiltroStatus}
          opcoes={[
            { id: 'todas', rotulo: 'Todas', n: metas.length },
            { id: 'ativa', rotulo: 'Ativas', n: resumo.ativas, ponto: 'bg-brand-500' },
            { id: 'concluida', rotulo: 'Concluídas', n: resumo.concluidas, ponto: 'bg-emerald-500' },
          ]}
        />
        <div className="relative sm:ml-auto sm:w-64">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar metas..." className="input-field pl-9" />
        </div>
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
