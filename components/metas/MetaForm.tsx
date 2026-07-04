'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { ImagemMetaInput } from '@/components/metas/ImagemMetaInput';
import type { Meta } from '@/types/database';
import type { MetaFormState } from '@/app/(dashboard)/metas/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

export function MetaForm({
  action,
  meta,
  onSucesso,
}: {
  action: (state: MetaFormState, formData: FormData) => Promise<MetaFormState>;
  meta?: Meta;
  onSucesso: () => void;
}) {
  const [state, formAction] = useFormState(async (state: MetaFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      <ImagemMetaInput imagemAtual={meta?.imagem_url} />

      <div>
        <label className="label-field" htmlFor="nome">Nome da meta</label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          defaultValue={meta?.nome}
          className="input-field"
          placeholder="Ex: Viagem de férias"
        />
      </div>

      <div>
        <label className="label-field" htmlFor="descricao">Descrição</label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          defaultValue={meta?.descricao ?? ''}
          className="input-field"
          placeholder="Descreva sua meta e o que ela significa para você..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="valor_alvo">Valor alvo</label>
          <input
            id="valor_alvo"
            name="valor_alvo"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={meta?.valor_alvo}
            className="input-field"
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="valor_atual">Valor atual</label>
          <input
            id="valor_atual"
            name="valor_atual"
            type="number"
            step="0.01"
            min="0"
            defaultValue={meta?.valor_atual ?? 0}
            className="input-field"
            placeholder="0,00"
          />
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor="data_alvo">Data alvo</label>
        <input
          id="data_alvo"
          name="data_alvo"
          type="date"
          defaultValue={meta?.data_alvo ?? ''}
          className="input-field"
        />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label={meta ? 'Salvar alterações' : 'Criar meta'} />
      </div>
    </form>
  );
}
