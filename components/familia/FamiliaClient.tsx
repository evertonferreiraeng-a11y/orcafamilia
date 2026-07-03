'use client';

import { useState } from 'react';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { AccountCard } from '@/components/ui/AccountCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface ContaResumo {
  id: string;
  nome: string;
  tipo: string;
  cor: string | null;
  saldo: number;
}

export interface DividaResumo {
  id: string;
  descricao: string;
  saldoDevedor: number;
  dataVencimento: string;
  status: string;
}

export interface MetaResumo {
  id: string;
  nome: string;
  valorAtual: number;
  valorAlvo: number;
}

export interface VisaoFamilia {
  receita: number;
  despesa: number;
  saldo: number;
  contas: ContaResumo[];
  dividas: DividaResumo[];
  metas: MetaResumo[];
}

type Aba = 'consolidado' | 'voce' | 'conjuge';

export function FamiliaClient({
  consolidado,
  voce,
  conjuge,
  temConjuge,
}: {
  consolidado: VisaoFamilia;
  voce: VisaoFamilia;
  conjuge: VisaoFamilia;
  temConjuge: boolean;
}) {
  const [aba, setAba] = useState<Aba>('consolidado');

  const visao = aba === 'consolidado' ? consolidado : aba === 'voce' ? voce : conjuge;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAba('consolidado')}
          className={aba === 'consolidado' ? 'btn-primary' : 'btn-secondary'}
        >
          Consolidado
        </button>
        <button type="button" onClick={() => setAba('voce')} className={aba === 'voce' ? 'btn-primary' : 'btn-secondary'}>
          Você
        </button>
        {temConjuge && (
          <button
            type="button"
            onClick={() => setAba('conjuge')}
            className={aba === 'conjuge' ? 'btn-primary' : 'btn-secondary'}
          >
            Cônjuge
          </button>
        )}
      </div>

      {!temConjuge && aba === 'consolidado' && (
        <p className="text-sm text-gray-400">
          Convide seu cônjuge para entrar na família (compartilhe o código em Ajustes) para ver a visão consolidada do casal.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard titulo="Receita" valor={visao.receita} tom="positivo" subtitulo="no período" />
        <SummaryCard titulo="Despesa" valor={visao.despesa} tom="negativo" subtitulo="no período" />
        <SummaryCard titulo="Saldo" valor={visao.saldo} tom={visao.saldo >= 0 ? 'positivo' : 'negativo'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Contas</h2>
          {visao.contas.length === 0 ? (
            <EmptyState mensagem="Nenhuma conta nesta visão." />
          ) : (
            visao.contas.map((c) => <AccountCard key={c.id} nome={c.nome} tipo={c.tipo} saldo={c.saldo} cor={c.cor} />)
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Dívidas ativas</h2>
          {visao.dividas.length === 0 ? (
            <EmptyState mensagem="Nenhuma dívida ativa nesta visão." />
          ) : (
            <div className="card divide-y divide-gray-50">
              {visao.dividas.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.descricao}</p>
                    <p className="text-xs text-gray-400">Vence em {formatDate(d.dataVencimento)}</p>
                  </div>
                  <p className="text-sm font-semibold text-negative">{formatCurrency(d.saldoDevedor)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Metas</h2>
        {visao.metas.length === 0 ? (
          <EmptyState mensagem="Nenhuma meta nesta visão." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visao.metas.map((m) => {
              const percentual = (m.valorAtual / m.valorAlvo) * 100;
              return (
                <div key={m.id} className="card p-5">
                  <p className="font-medium text-gray-900">{m.nome}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatCurrency(m.valorAtual)} de {formatCurrency(m.valorAlvo)}
                  </p>
                  <div className="mt-2">
                    <ProgressBar percentual={percentual} tom="brand" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
