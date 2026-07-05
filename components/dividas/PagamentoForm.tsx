'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { DividaFormState } from '@/app/(dashboard)/dividas/actions';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Conta } from '@/types/database';

function BotaoRegistrar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Registrando...' : 'Registrar'}
    </button>
  );
}

export function PagamentoForm({
  action,
  saldoDevedor,
  parcelaAtual,
  parcelasTotal,
  valorParcela,
  dataVencimento,
  contas,
  onSucesso,
  onCancelar,
}: {
  action: (state: DividaFormState, formData: FormData) => Promise<DividaFormState>;
  saldoDevedor: number;
  parcelaAtual: number | null;
  parcelasTotal: number | null;
  valorParcela: number | null;
  dataVencimento: string;
  contas: Conta[];
  onSucesso: () => void;
  onCancelar: () => void;
}) {
  const [state, formAction] = useFormState(async (state: DividaFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      {parcelasTotal && (
        <div className="rounded-xl bg-brand-50 p-3">
          <p className="text-sm font-semibold text-brand-700">
            Parcela {parcelaAtual} de {parcelasTotal}
          </p>
          <p className="mt-0.5 text-xs text-brand-600">
            Vencimento: {formatDate(dataVencimento)}
            {valorParcela && ` · Valor da parcela: ${formatCurrency(valorParcela)}`}
          </p>
        </div>
      )}

      <div>
        <label className="label-field" htmlFor="valor_pagamento">Valor do Pagamento *</label>
        <input
          id="valor_pagamento"
          name="valor_pagamento"
          type="number"
          step="0.01"
          min="0.01"
          max={saldoDevedor}
          required
          autoFocus
          defaultValue={valorParcela ? valorParcela.toFixed(2) : undefined}
          className="input-field"
          placeholder="0,00"
        />
        <p className="mt-1 text-xs text-gray-400">Máximo: {formatCurrency(saldoDevedor)}</p>
      </div>

      <div>
        <label className="label-field" htmlFor="data_pagamento">Data do Pagamento *</label>
        <input
          id="data_pagamento"
          name="data_pagamento"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="input-field"
        />
      </div>

      <div>
        <label className="label-field" htmlFor="conta_id">Conta *</label>
        <select id="conta_id" name="conta_id" required defaultValue="" className="input-field">
          <option value="" disabled>Selecione a conta</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">De onde o valor será debitado (gera uma transação automaticamente).</p>
      </div>

      <div>
        <label className="label-field" htmlFor="observacao">Observações</label>
        <textarea
          id="observacao"
          name="observacao"
          rows={3}
          className="input-field"
          placeholder="Observações sobre o pagamento (opcional)"
        />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancelar} className="btn-secondary">
          Cancelar
        </button>
        <BotaoRegistrar />
      </div>
    </form>
  );
}
