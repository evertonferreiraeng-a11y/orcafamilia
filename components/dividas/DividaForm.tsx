'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { Divida, Categoria, Subcategoria, Conta } from '@/types/database';
import type { DividaFormState } from '@/app/(dashboard)/dividas/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

export function DividaForm({
  action,
  divida,
  categorias,
  subcategorias,
  contas,
  onSucesso,
}: {
  action: (state: DividaFormState, formData: FormData) => Promise<DividaFormState>;
  divida?: Divida;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  contas: Conta[];
  onSucesso: () => void;
}) {
  const [state, formAction] = useFormState(async (state: DividaFormState, formData: FormData) => {
    const resultado = await action(state, formData);
    if (!resultado.error) onSucesso();
    return resultado;
  }, {});

  const [categoriaId, setCategoriaId] = useState(divida?.categoria_id ?? '');
  const [gerarParcelas, setGerarParcelas] = useState(false);
  const subcategoriasFiltradas = subcategorias.filter((s) => s.categoria_id === categoriaId);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label-field" htmlFor="descricao">Descrição</label>
        <input
          id="descricao"
          name="descricao"
          type="text"
          required
          defaultValue={divida?.descricao}
          className="input-field"
          placeholder="Ex: Financiamento carro"
        />
      </div>

      <div>
        <label className="label-field" htmlFor="credor">Credor</label>
        <input
          id="credor"
          name="credor"
          type="text"
          defaultValue={divida?.credor ?? ''}
          className="input-field"
          placeholder="Ex: Banco Itaú"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="valor_total">Valor total</label>
          <input
            id="valor_total"
            name="valor_total"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={divida?.valor_total}
            className="input-field"
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="parcelas_total">Parcelas</label>
          <input
            id="parcelas_total"
            name="parcelas_total"
            type="number"
            min="1"
            defaultValue={divida?.parcelas_total ?? ''}
            className="input-field"
            placeholder="Ex: 12"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="categoria_id">Categoria</label>
          <select
            id="categoria_id"
            name="categoria_id"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="input-field"
          >
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor="subcategoria_id">Subcategoria</label>
          <select
            id="subcategoria_id"
            name="subcategoria_id"
            defaultValue={divida?.subcategoria_id ?? ''}
            disabled={subcategoriasFiltradas.length === 0}
            className="input-field disabled:bg-gray-50 disabled:text-gray-400"
          >
            {subcategoriasFiltradas.length === 0 ? (
              <option value="">Sem subcategorias</option>
            ) : (
              <>
                <option value="">Nenhuma</option>
                {subcategoriasFiltradas.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>
      <p className="-mt-2 text-xs text-gray-400">
        Usadas para categorizar automaticamente as transações geradas ao registrar pagamentos.
      </p>

      <div>
        <label className="label-field" htmlFor="data_vencimento">Próximo vencimento</label>
        <input
          id="data_vencimento"
          name="data_vencimento"
          type="date"
          required
          defaultValue={divida?.data_vencimento}
          className="input-field"
        />
      </div>

      {!divida && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center gap-2">
            <input
              id="gerar_parcelas"
              name="gerar_parcelas"
              type="checkbox"
              checked={gerarParcelas}
              onChange={(e) => setGerarParcelas(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="gerar_parcelas" className="text-sm text-gray-700">
              Gerar as parcelas em Transações
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-400">Cria automaticamente uma transação para cada parcela desta dívida.</p>

          {gerarParcelas && (
            <div className="mt-3">
              <label className="label-field" htmlFor="conta_parcelas_id">Conta das parcelas</label>
              <select id="conta_parcelas_id" name="conta_parcelas_id" required defaultValue="" className="input-field">
                <option value="">Selecione a conta</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label={divida ? 'Salvar alterações' : 'Cadastrar dívida'} />
      </div>
    </form>
  );
}
