'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { CofreForm } from '@/components/cofre/CofreForm';
import { CofreCard } from '@/components/cofre/CofreCard';
import { MovimentacaoCofreForm } from '@/components/cofre/MovimentacaoCofreForm';
import { IconPlus, IconCofre, IconWallet, IconSearch } from '@/components/icons';
import { criarCofre, atualizarCofre, registrarMovimentacaoCofre } from '@/app/(dashboard)/cofre/actions';
import type { CofreSeguro } from '@/components/cofre/types';
import type { CofreMovimentacao, TipoMovimentacaoCofre } from '@/types/database';

export function CofreClient({
  cofres,
  movimentacoes,
}: {
  cofres: CofreSeguro[];
  movimentacoes: CofreMovimentacao[];
}) {
  const [modalForm, setModalForm] = useState(false);
  const [modalMovimentacao, setModalMovimentacao] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<TipoMovimentacaoCofre>('deposito');
  const [selecionado, setSelecionado] = useState<CofreSeguro | undefined>(undefined);
  const [busca, setBusca] = useState('');

  const movimentacoesPorCofre = useMemo(() => {
    const mapa = new Map<string, CofreMovimentacao[]>();
    for (const m of movimentacoes) {
      const lista = mapa.get(m.cofre_id) ?? [];
      lista.push(m);
      mapa.set(m.cofre_id, lista);
    }
    return mapa;
  }, [movimentacoes]);

  const totalGuardado = cofres.reduce((a, c) => a + Number(c.saldo), 0);

  const cofresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return cofres;
    return cofres.filter(
      (c) => c.nome.toLowerCase().includes(termo) || (c.descricao ?? '').toLowerCase().includes(termo)
    );
  }, [cofres, busca]);

  function abrirNovo() {
    setSelecionado(undefined);
    setModalForm(true);
  }

  function abrirEdicao(c: CofreSeguro) {
    setSelecionado(c);
    setModalForm(true);
  }

  function abrirMovimentacao(c: CofreSeguro, tipo: TipoMovimentacaoCofre) {
    setSelecionado(c);
    setTipoMovimentacao(tipo);
    setModalMovimentacao(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <IconCofre className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cofre</h1>
            <p className="mt-1 text-sm text-gray-500">Guarde dinheiro para projetos e reservas específicas</p>
          </div>
        </div>
        <button type="button" onClick={abrirNovo} className="btn-primary">
          <IconPlus className="h-4 w-4" />
          Novo cofre
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard titulo="Total Guardado" valor={totalGuardado} tom="positivo" icon={IconWallet} />
        <div className="rounded-2xl bg-brand-50 p-4 transition-shadow hover:shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
              <IconCofre className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-gray-600">Cofres Ativos</p>
          </div>
          <p className="mt-4 text-xl font-bold text-gray-900">{cofres.length}</p>
        </div>
      </div>

      {cofres.length > 0 && (
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar cofres..."
            className="input-field pl-9"
          />
        </div>
      )}

      {cofresFiltrados.length === 0 ? (
        <EmptyState mensagem={cofres.length === 0 ? 'Nenhum cofre criado ainda.' : 'Nenhum cofre encontrado.'} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cofresFiltrados.map((c) => (
            <CofreCard
              key={c.id}
              cofre={c}
              historico={movimentacoesPorCofre.get(c.id) ?? []}
              onEditar={abrirEdicao}
              onMovimentar={abrirMovimentacao}
            />
          ))}
        </div>
      )}

      <Modal open={modalForm} onClose={() => setModalForm(false)} title={selecionado ? 'Editar cofre' : 'Novo cofre'}>
        <CofreForm
          action={selecionado ? atualizarCofre.bind(null, selecionado.id) : criarCofre}
          cofre={selecionado}
          onSucesso={() => setModalForm(false)}
        />
      </Modal>

      <Modal
        open={modalMovimentacao}
        onClose={() => setModalMovimentacao(false)}
        title={selecionado ? `${tipoMovimentacao === 'deposito' ? 'Depositar em' : 'Retirar de'} ${selecionado.nome}` : ''}
      >
        {selecionado && (
          <MovimentacaoCofreForm
            action={registrarMovimentacaoCofre.bind(null, selecionado.id)}
            saldoAtual={Number(selecionado.saldo)}
            tipoInicial={tipoMovimentacao}
            onSucesso={() => setModalMovimentacao(false)}
            onCancelar={() => setModalMovimentacao(false)}
          />
        )}
      </Modal>
    </div>
  );
}
