'use client';

import { useState } from 'react';
import { pagarFatura, desfazerPagamentoFatura, excluirTransacoes } from '@/app/(dashboard)/transacoes/actions';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { IconCartao, IconCheck, IconTrash } from '@/components/icons';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Cartao, Conta } from '@/types/database';
import type { TransacaoComRelacoes } from '@/components/transacoes/TransacoesClient';

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FaturasView({
  transacoes,
  cartoes,
  contas,
}: {
  transacoes: TransacaoComRelacoes[];
  cartoes: Cartao[];
  contas: Conta[];
}) {
  const [processando, setProcessando] = useState<string | null>(null);
  const [faturaAbrindo, setFaturaAbrindo] = useState<{ cartaoId: string; itens: TransacaoComRelacoes[] } | null>(null);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [dataPagamento, setDataPagamento] = useState(hoje());
  const [erro, setErro] = useState('');

  const faturas = cartoes
    .map((cartao) => {
      const itens = transacoes.filter((t) => t.cartao_id === cartao.id);
      const total = itens.reduce((a, t) => a + t.valor, 0);
      const pago = itens.length > 0 && itens.every((t) => t.pago);
      return { cartao, itens, total, pago };
    })
    .filter((f) => f.itens.length > 0);

  function abrirPagamento(cartao: Cartao, itens: TransacaoComRelacoes[]) {
    setErro('');
    setContaSelecionada(cartao.conta_pagamento_id ?? '');
    setDataPagamento(hoje());
    setFaturaAbrindo({ cartaoId: cartao.id, itens });
  }

  async function confirmarPagamento() {
    if (!faturaAbrindo) return;
    setProcessando(faturaAbrindo.cartaoId);
    const resultado = await pagarFatura(
      faturaAbrindo.itens.map((t) => t.id),
      contaSelecionada,
      dataPagamento
    );
    setProcessando(null);
    if (resultado.error) {
      setErro(resultado.error);
      return;
    }
    setFaturaAbrindo(null);
  }

  async function desfazer(cartaoId: string, itens: TransacaoComRelacoes[]) {
    if (!window.confirm('Desfazer o pagamento desta fatura? Os lançamentos voltarão a ficar pendentes.')) return;
    setProcessando(cartaoId);
    await desfazerPagamentoFatura(itens.map((t) => t.id));
    setProcessando(null);
  }

  async function excluirFatura(cartaoId: string, itens: TransacaoComRelacoes[]) {
    if (
      !window.confirm(
        `Excluir todos os ${itens.length} lançamentos desta fatura? Essa ação não pode ser desfeita.`
      )
    )
      return;
    setProcessando(cartaoId);
    await excluirTransacoes(itens.map((t) => t.id));
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
        <div key={cartao.id} className="card p-4">
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
            <div className="flex items-start gap-2 text-right">
              <div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(total)}</p>
                <button
                  type="button"
                  disabled={processando === cartao.id}
                  onClick={() => (pago ? desfazer(cartao.id, itens) : abrirPagamento(cartao, itens))}
                  className={cn(
                    'mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-50',
                    pago ? 'bg-positive/10 text-positive' : 'bg-amber-100 text-amber-700'
                  )}
                >
                  <IconCheck className="h-3 w-3" />
                  {pago ? 'Fatura paga' : 'Pagar fatura'}
                </button>
              </div>
              <button
                type="button"
                disabled={processando === cartao.id}
                onClick={() => excluirFatura(cartao.id, itens)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-negative disabled:opacity-50"
                aria-label="Excluir fatura completa"
                title="Excluir fatura completa"
              >
                <IconTrash className="h-4 w-4" />
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

      <Modal open={faturaAbrindo !== null} onClose={() => setFaturaAbrindo(null)} title="Pagar fatura">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Total da fatura: <span className="font-semibold text-gray-900">{formatCurrency(faturaAbrindo?.itens.reduce((a, t) => a + t.valor, 0) ?? 0)}</span>
          </p>
          <div>
            <label className="label-field" htmlFor="conta_pagamento_fatura">Conta usada no pagamento</label>
            <select
              id="conta_pagamento_fatura"
              value={contaSelecionada}
              onChange={(e) => setContaSelecionada(e.target.value)}
              className="input-field"
            >
              <option value="">Selecione a conta</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field" htmlFor="data_pagamento_fatura">Data do pagamento</label>
            <input
              id="data_pagamento_fatura"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="input-field"
            />
          </div>
          {erro && <p className="text-sm text-negative">{erro}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setFaturaAbrindo(null)} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarPagamento}
              disabled={processando === faturaAbrindo?.cartaoId}
              className="btn-primary"
            >
              {processando === faturaAbrindo?.cartaoId ? 'Salvando...' : 'Confirmar pagamento'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
