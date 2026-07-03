'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { atualizarAlertas, type AjustesFormState } from '@/app/(dashboard)/ajustes/actions';
import type { AlertasConfig } from '@/types/database';

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar alertas'}
    </button>
  );
}

export function AlertasForm({ config }: { config: AlertasConfig | null }) {
  const [state, formAction] = useFormState<AjustesFormState, FormData>(atualizarAlertas, {});

  const [saldoAtivo, setSaldoAtivo] = useState(config?.alerta_saldo_ativo ?? false);
  const [dividaAtivo, setDividaAtivo] = useState(config?.alerta_divida_ativo ?? false);
  const [orcamentoAtivo, setOrcamentoAtivo] = useState(config?.alerta_orcamento_ativo ?? false);

  return (
    <form action={formAction} className="card space-y-6 p-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">Alertas via WhatsApp</h2>
        <p className="mt-1 text-xs text-gray-400">
          Configure abaixo quando você quer ser avisado. Os alertas são verificados diariamente.
        </p>
      </div>

      <div>
        <label className="label-field" htmlFor="telefone">Número do WhatsApp</label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          defaultValue={config?.telefone ?? ''}
          className="input-field"
          placeholder="+5511999999999"
        />
      </div>

      <div className="space-y-4 divide-y divide-gray-50">
        <div className="flex items-start justify-between gap-4 pt-4 first:pt-0">
          <div>
            <p className="text-sm font-medium text-gray-800">Saldo baixo</p>
            <p className="text-xs text-gray-400">Avisa quando o saldo de alguma conta cair abaixo do limite.</p>
            {saldoAtivo && (
              <div className="mt-2 max-w-xs">
                <label className="label-field" htmlFor="alerta_saldo_limite">Saldo mínimo</label>
                <input
                  id="alerta_saldo_limite"
                  name="alerta_saldo_limite"
                  type="number"
                  step="0.01"
                  defaultValue={config?.alerta_saldo_limite ?? ''}
                  className="input-field"
                  placeholder="0,00"
                />
              </div>
            )}
          </div>
          <input
            type="checkbox"
            name="alerta_saldo_ativo"
            checked={saldoAtivo}
            onChange={(e) => setSaldoAtivo(e.target.checked)}
            className="mt-1 h-5 w-9 shrink-0 appearance-none rounded-full bg-gray-200 transition-colors checked:bg-brand-500 relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
          />
        </div>

        <div className="flex items-start justify-between gap-4 pt-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Dívida próxima do vencimento</p>
            <p className="text-xs text-gray-400">Avisa X dias antes do vencimento de uma dívida ativa.</p>
            {dividaAtivo && (
              <div className="mt-2 max-w-xs">
                <label className="label-field" htmlFor="alerta_divida_dias_antes">Dias de antecedência</label>
                <input
                  id="alerta_divida_dias_antes"
                  name="alerta_divida_dias_antes"
                  type="number"
                  min={1}
                  defaultValue={config?.alerta_divida_dias_antes ?? 3}
                  className="input-field"
                />
              </div>
            )}
          </div>
          <input
            type="checkbox"
            name="alerta_divida_ativo"
            checked={dividaAtivo}
            onChange={(e) => setDividaAtivo(e.target.checked)}
            className="mt-1 h-5 w-9 shrink-0 appearance-none rounded-full bg-gray-200 transition-colors checked:bg-brand-500 relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
          />
        </div>

        <div className="flex items-start justify-between gap-4 pt-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Orçamento estourando</p>
            <p className="text-xs text-gray-400">Avisa quando um orçamento atingir X% do limite.</p>
            {orcamentoAtivo && (
              <div className="mt-2 max-w-xs">
                <label className="label-field" htmlFor="alerta_orcamento_percentual">Percentual do orçamento</label>
                <input
                  id="alerta_orcamento_percentual"
                  name="alerta_orcamento_percentual"
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={config?.alerta_orcamento_percentual ?? 90}
                  className="input-field"
                />
              </div>
            )}
          </div>
          <input
            type="checkbox"
            name="alerta_orcamento_ativo"
            checked={orcamentoAtivo}
            onChange={(e) => setOrcamentoAtivo(e.target.checked)}
            className="mt-1 h-5 w-9 shrink-0 appearance-none rounded-full bg-gray-200 transition-colors checked:bg-brand-500 relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.sucesso && <p className="text-sm text-positive">Configuração de alertas salva.</p>}

      <BotaoSalvar />
    </form>
  );
}
