'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { Cartao, Conta } from '@/types/database';
import type { CadastroFormState } from '@/app/(dashboard)/cadastro/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

export function CartaoForm({
  action,
  cartao,
  contas,
  onSucesso,
}: {
  action: (state: CadastroFormState, formData: FormData) => Promise<CadastroFormState>;
  cartao?: Cartao;
  contas: Conta[];
  onSucesso: () => void;
}) {
  const [state, formAction] = useFormState(async (state: CadastroFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label-field" htmlFor="nome">Nome</label>
        <input id="nome" name="nome" type="text" required defaultValue={cartao?.nome} className="input-field" placeholder="Ex: Nubank Ultravioleta" />
      </div>

      <div>
        <label className="label-field" htmlFor="bandeira">Bandeira</label>
        <input id="bandeira" name="bandeira" type="text" defaultValue={cartao?.bandeira ?? ''} className="input-field" placeholder="Visa, Mastercard..." />
      </div>

      <div>
        <label className="label-field" htmlFor="limite">Limite</label>
        <input id="limite" name="limite" type="number" step="0.01" defaultValue={cartao?.limite ?? 0} className="input-field" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="dia_fechamento">Dia de fechamento</label>
          <input
            id="dia_fechamento"
            name="dia_fechamento"
            type="number"
            min={1}
            max={31}
            required
            defaultValue={cartao?.dia_fechamento ?? 1}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="dia_vencimento">Dia de vencimento</label>
          <input
            id="dia_vencimento"
            name="dia_vencimento"
            type="number"
            min={1}
            max={31}
            required
            defaultValue={cartao?.dia_vencimento ?? 10}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor="conta_pagamento_id">Conta de pagamento</label>
        <select id="conta_pagamento_id" name="conta_pagamento_id" defaultValue={cartao?.conta_pagamento_id ?? ''} className="input-field">
          <option value="">Nenhuma</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label={cartao ? 'Salvar alterações' : 'Cadastrar cartão'} />
      </div>
    </form>
  );
}
