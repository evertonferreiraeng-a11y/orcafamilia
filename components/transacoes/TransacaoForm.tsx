'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { Categoria, Conta, Cartao, Transacao } from '@/types/database';
import type { TransacaoFormState } from '@/app/(dashboard)/transacoes/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

export function TransacaoForm({
  action,
  categorias,
  contas,
  cartoes,
  transacao,
  onSucesso,
}: {
  action: (state: TransacaoFormState, formData: FormData) => Promise<TransacaoFormState>;
  categorias: Categoria[];
  contas: Conta[];
  cartoes: Cartao[];
  transacao?: Transacao;
  onSucesso: () => void;
}) {
  const [state, formAction] = useFormState(async (state: TransacaoFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  const [tipo, setTipo] = useState<'receita' | 'despesa'>(transacao?.tipo ?? 'despesa');
  const [recorrente, setRecorrente] = useState(transacao?.recorrente ?? false);

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTipo('despesa')}
          className={tipo === 'despesa' ? 'btn-danger flex-1' : 'btn-secondary flex-1'}
        >
          Despesa
        </button>
        <button
          type="button"
          onClick={() => setTipo('receita')}
          className={tipo === 'receita' ? 'flex-1 rounded-xl bg-positive px-4 py-2 text-sm font-medium text-white' : 'btn-secondary flex-1'}
        >
          Receita
        </button>
        <input type="hidden" name="tipo" value={tipo} />
      </div>

      <div>
        <label className="label-field" htmlFor="descricao">Descrição</label>
        <input
          id="descricao"
          name="descricao"
          type="text"
          required
          defaultValue={transacao?.descricao}
          className="input-field"
          placeholder="Ex: Supermercado"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="valor">Valor</label>
          <input
            id="valor"
            name="valor"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={transacao?.valor}
            className="input-field"
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="data">Data</label>
          <input
            id="data"
            name="data"
            type="date"
            required
            defaultValue={transacao?.data ?? new Date().toISOString().slice(0, 10)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor="categoria_id">Categoria</label>
        <select
          id="categoria_id"
          name="categoria_id"
          required
          defaultValue={transacao?.categoria_id}
          className="input-field"
        >
          <option value="">Selecione...</option>
          {categoriasFiltradas.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="conta_id">Conta</label>
          <select id="conta_id" name="conta_id" defaultValue={transacao?.conta_id ?? ''} className="input-field">
            <option value="">Nenhuma</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor="cartao_id">Cartão</label>
          <select id="cartao_id" name="cartao_id" defaultValue={transacao?.cartao_id ?? ''} className="input-field">
            <option value="">Nenhum</option>
            {cartoes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="recorrente"
          name="recorrente"
          type="checkbox"
          checked={recorrente}
          onChange={(e) => setRecorrente(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        <label htmlFor="recorrente" className="text-sm text-gray-700">Transação recorrente</label>
      </div>

      {recorrente && (
        <div>
          <label className="label-field" htmlFor="frequencia">Frequência</label>
          <select id="frequencia" name="frequencia" defaultValue={transacao?.frequencia ?? 'mensal'} className="input-field">
            <option value="mensal">Mensal</option>
            <option value="semanal">Semanal</option>
          </select>
        </div>
      )}

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <BotaoSalvar label={transacao ? 'Salvar alterações' : 'Adicionar transação'} />
      </div>
    </form>
  );
}
