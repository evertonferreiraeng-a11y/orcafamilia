'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { IconPlus, IconEdit } from '@/components/icons';
import { TransacaoForm } from '@/components/transacoes/TransacaoForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';
import { criarTransacao, atualizarTransacao, excluirTransacao } from '@/app/(dashboard)/transacoes/actions';
import type { Categoria, Conta, Cartao, Transacao } from '@/types/database';

export interface TransacaoComSaldo extends Transacao {
  categoriaNome: string;
  categoriaCor: string | null;
  contaNome: string | null;
  cartaoNome: string | null;
  saldoCorrente: number;
}

export function TransacoesClient({
  transacoes,
  categorias,
  contas,
  cartoes,
}: {
  transacoes: TransacaoComSaldo[];
  categorias: Categoria[];
  contas: Conta[];
  cartoes: Cartao[];
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Transacao | undefined>(undefined);

  function abrirNova() {
    setEditando(undefined);
    setModalAberto(true);
  }

  function abrirEdicao(t: Transacao) {
    setEditando(t);
    setModalAberto(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={abrirNova} className="btn-primary">
          <IconPlus className="h-4 w-4" />
          Nova transação
        </button>
      </div>

      {transacoes.length === 0 ? (
        <EmptyState mensagem="Nenhuma transação encontrada para os filtros selecionados." />
      ) : (
        <div className="card overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Descrição</th>
                <th className="px-3 py-3 font-medium">Categoria</th>
                <th className="px-3 py-3 font-medium">Conta/Cartão</th>
                <th className="px-3 py-3 text-right font-medium">Valor</th>
                <th className="px-3 py-3 text-right font-medium">Saldo corrente</th>
                <th className="px-3 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transacoes.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-3 py-3 text-gray-500">{formatDate(t.data)}</td>
                  <td className="px-3 py-3 text-gray-800">
                    {t.descricao}
                    {t.recorrente && (
                      <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600">
                        {t.frequencia === 'semanal' ? 'semanal' : 'mensal'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ backgroundColor: `${t.categoriaCor ?? '#888888'}1a`, color: t.categoriaCor ?? '#888888' }}
                    >
                      {t.categoriaNome}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{t.contaNome ?? t.cartaoNome ?? '—'}</td>
                  <td className={`px-3 py-3 text-right font-medium ${t.tipo === 'receita' ? 'text-positive' : 'text-negative'}`}>
                    {t.tipo === 'receita' ? '+' : '-'} {formatCurrency(Math.abs(t.valor))}
                  </td>
                  <td className={`px-3 py-3 text-right font-medium ${t.saldoCorrente < 0 ? 'text-negative' : 'text-gray-900'}`}>
                    {formatCurrency(t.saldoCorrente)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(t)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Editar"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <DeleteButton
                        action={() => excluirTransacao(t.id)}
                        confirmMessage="Excluir esta transação?"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar transação' : 'Nova transação'}>
        <TransacaoForm
          action={editando ? atualizarTransacao.bind(null, editando.id) : criarTransacao}
          categorias={categorias}
          contas={contas}
          cartoes={cartoes}
          transacao={editando}
          onSucesso={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  );
}
