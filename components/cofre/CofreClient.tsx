'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { CofreForm } from '@/components/cofre/CofreForm';
import { MovimentacaoCofreForm } from '@/components/cofre/MovimentacaoCofreForm';
import {
  IconPlus,
  IconEdit,
  IconCofre,
  IconWallet,
  IconDepositar,
  IconRetirar,
  IconSearch,
  IconChevronDown,
} from '@/components/icons';
import {
  criarCofre,
  atualizarCofre,
  registrarMovimentacaoCofre,
  excluirCofre,
  excluirMovimentacaoCofre,
} from '@/app/(dashboard)/cofre/actions';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Cofre, CofreMovimentacao, TipoMovimentacaoCofre } from '@/types/database';

export function CofreClient({
  cofres,
  movimentacoes,
}: {
  cofres: Cofre[];
  movimentacoes: CofreMovimentacao[];
}) {
  const [modalForm, setModalForm] = useState(false);
  const [modalMovimentacao, setModalMovimentacao] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<TipoMovimentacaoCofre>('deposito');
  const [selecionado, setSelecionado] = useState<Cofre | undefined>(undefined);
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

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

  function abrirEdicao(c: Cofre) {
    setSelecionado(c);
    setModalForm(true);
  }

  function abrirMovimentacao(c: Cofre, tipo: TipoMovimentacaoCofre) {
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
          {cofresFiltrados.map((c) => {
            const historico = movimentacoesPorCofre.get(c.id) ?? [];
            const aberto = expandido === c.id;

            return (
              <div key={c.id} className="card p-4 transition-shadow hover:shadow-elevated">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${c.cor ?? '#2a78d6'}1a`, color: c.cor ?? '#2a78d6' }}
                    >
                      <IconCofre className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{c.nome}</p>
                      {c.descricao && <p className="text-xs text-gray-400">{c.descricao}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirEdicao(c)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Editar"
                  >
                    <IconEdit className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-4 text-xs text-gray-400">Saldo guardado</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(Number(c.saldo))}</p>

                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => abrirMovimentacao(c, 'deposito')} className="btn-secondary flex-1">
                    <IconDepositar className="h-4 w-4" />
                    Depositar
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirMovimentacao(c, 'retirada')}
                    disabled={Number(c.saldo) <= 0}
                    className="btn-secondary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IconRetirar className="h-4 w-4" />
                    Retirar
                  </button>
                  <DeleteButton
                    action={() => excluirCofre(c.id)}
                    confirmMessage="Excluir este cofre e todo o histórico de movimentações?"
                  />
                </div>

                {historico.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setExpandido(aberto ? null : c.id)}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      {aberto ? 'Ocultar histórico' : `Ver histórico (${historico.length})`}
                      <IconChevronDown className={cn('h-3.5 w-3.5 transition-transform', aberto && 'rotate-180')} />
                    </button>

                    {aberto && (
                      <div className="mt-2 space-y-1.5">
                        {historico.map((m) => (
                          <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <p className="text-gray-600">
                                {formatDate(m.data)}
                                {m.descricao ? ` · ${m.descricao}` : ''}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span
                                className={cn(
                                  'font-semibold',
                                  m.tipo === 'deposito' ? 'text-positive' : 'text-negative'
                                )}
                              >
                                {m.tipo === 'deposito' ? '+' : '-'} {formatCurrency(Number(m.valor))}
                              </span>
                              <DeleteButton
                                action={() => excluirMovimentacaoCofre(m.id, c.id)}
                                confirmMessage="Excluir esta movimentação?"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
