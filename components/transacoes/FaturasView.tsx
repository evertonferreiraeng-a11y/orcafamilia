'use client';

import { useState } from 'react';
import { alternarPagoTransacao } from '@/app/(dashboard)/transacoes/actions';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconCartao, IconCheck } from '@/components/icons';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Cartao } from '@/types/database';
import type { TransacaoComRelacoes } from '@/components/transacoes/TransacoesClient';

export function FaturasView({
  transacoes,
  cartoes,
}: {
  transacoes: TransacaoComRelacoes[];
  cartoes: Cartao[];
}) {
  const [processando, setProcessando] = useState<string | null>(null);

  const faturas = cartoes
    .map((cartao) => {
      const itens = transacoes.filter((t) => t.cartao_id === cartao.id);
      const total = itens.reduce((a, t) => a + t.valor, 0);
      const pago = itens.length > 0 && itens.every((t) => t.pago);
      return { cartao, itens, total, pago };
    })
    .filter((f) => f.itens.length > 0);

  async function marcarFaturaPaga(cartaoId: string, itens: TransacaoComRelacoes[], pago: boolean) {
    setProcessando(cartaoId);
    await Promise.all(itens.map((t) => alternarPagoTransacao(t.id, pago)));
    setProcessando(null);
  }

  if (faturas.length === 0) {
    return <EmptyState mensagem="Nenhuma compra no cartão neste período." />;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        Fatura calculada a partir das compras no cartão dentro do mês selecionado acima.
      </p>
      {faturas.map(({ cartao, itens, total, pago }) => (
        <div key={cartao.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <IconCartao className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-gray-900">{cartao.nome}</p>
                <p className="text-xs text-gray-400">
                  Fechamento dia {cartao.dia_fechamento} · Vencimento dia {cartao.dia_vencimento}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">{formatCurrency(total)}</p>
              <button
                type="button"
                disabled={processando === cartao.id}
                onClick={() => marcarFaturaPaga(cartao.id, itens, !pago)}
                className={cn(
                  'mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-50',
                  pago ? 'bg-positive/10 text-positive' : 'bg-amber-100 text-amber-700'
                )}
              >
                <IconCheck className="h-3 w-3" />
                {pago ? 'Fatura paga' : 'Marcar fatura como paga'}
              </button>
            </div>
          </div>

          <div className="mt-4 divide-y divide-gray-50 border-t border-gray-50">
            {itens.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-gray-800">{t.descricao}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(t.data)}
                    {t.parcela_total ? ` · Parcela ${t.parcela_atual}/${t.parcela_total}` : ''}
                  </p>
                </div>
                <span className="font-medium text-negative">{formatCurrency(t.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
