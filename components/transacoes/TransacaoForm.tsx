'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { Categoria, Subcategoria, Conta, Cartao, Transacao } from '@/types/database';
import type { TransacaoFormState } from '@/app/(dashboard)/transacoes/actions';

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Salvando...' : label}
    </button>
  );
}

type Aba = 'despesa' | 'receita' | 'transferencia';

const ABA_LABEL: Record<Aba, string> = {
  despesa: 'Despesa',
  receita: 'Receita',
  transferencia: 'Transferência',
};

export function TransacaoForm({
  action,
  categorias,
  subcategorias,
  contas,
  cartoes,
  transacao,
  onSucesso,
}: {
  action: (state: TransacaoFormState, formData: FormData) => Promise<TransacaoFormState>;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
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

  const [aba, setAba] = useState<Aba>(transacao?.eh_transferencia ? 'transferencia' : (transacao?.tipo ?? 'despesa'));
  const [formaPagamento, setFormaPagamento] = useState<'debito' | 'credito'>(transacao?.cartao_id ? 'credito' : 'debito');
  const [categoriaId, setCategoriaId] = useState(transacao?.categoria_id ?? '');
  const [pago, setPago] = useState(transacao?.pago ?? false);
  const [recorrente, setRecorrente] = useState(transacao?.recorrente ?? false);

  const tipoLancamento: 'despesa' | 'receita' = aba === 'transferencia' ? 'despesa' : aba;
  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipoLancamento);
  const subcategoriasFiltradas = subcategorias.filter((s) => s.categoria_id === categoriaId);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="aba" value={aba} />

      {transacao ? (
        <p className="text-sm font-medium text-gray-500">{ABA_LABEL[aba]}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setAba('despesa')}
            className={aba === 'despesa' ? 'btn-danger' : 'btn-secondary'}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setAba('receita')}
            className={
              aba === 'receita'
                ? 'rounded-xl bg-positive px-4 py-2 text-sm font-medium text-white'
                : 'btn-secondary'
            }
          >
            Receita
          </button>
          <button
            type="button"
            onClick={() => setAba('transferencia')}
            className={aba === 'transferencia' ? 'btn-primary' : 'btn-secondary'}
          >
            Transferência
          </button>
        </div>
      )}

      {aba !== 'transferencia' && (
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
      )}

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

      {aba === 'transferencia' ? (
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
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-field" htmlFor="data_registro">Data de Registro</label>
            <input
              id="data_registro"
              name="data_registro"
              type="date"
              required
              defaultValue={transacao?.data_registro ?? new Date().toISOString().slice(0, 10)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="data_vencimento">Data de Vencimento</label>
            <input
              id="data_vencimento"
              name="data_vencimento"
              type="date"
              required
              defaultValue={transacao?.data_vencimento ?? transacao?.data ?? new Date().toISOString().slice(0, 10)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="data">Data de Pagamento</label>
            <input
              id="data"
              name="data"
              type="date"
              defaultValue={transacao?.data ?? ''}
              onChange={(e) => setPago(e.target.value !== '')}
              className="input-field"
              placeholder="Preencher ao pagar"
            />
            <p className="mt-1 text-xs text-gray-400">Deixe em branco até efetuar o pagamento.</p>
          </div>
        </div>
      )}

      {aba !== 'transferencia' && (
        <div className="flex items-center gap-2">
          <input
            id="pago"
            name="pago"
            type="checkbox"
            checked={pago}
            onChange={(e) => setPago(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          <label htmlFor="pago" className="text-sm text-gray-700">Marcar como paga</label>
        </div>
      )}

      {aba === 'despesa' && (
        <div>
          <label className="label-field">Forma de Pagamento</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormaPagamento('debito')}
              className={
                formaPagamento === 'debito'
                  ? 'rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700'
                  : 'rounded-xl border-2 border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600'
              }
            >
              Débito
            </button>
            <button
              type="button"
              onClick={() => setFormaPagamento('credito')}
              className={
                formaPagamento === 'credito'
                  ? 'rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700'
                  : 'rounded-xl border-2 border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600'
              }
            >
              Crédito
            </button>
          </div>
        </div>
      )}

      {aba === 'transferencia' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field" htmlFor="conta_origem_id">Conta de Origem</label>
            <select
              id="conta_origem_id"
              name="conta_origem_id"
              required
              defaultValue={transacao?.conta_id ?? ''}
              className="input-field"
            >
              <option value="">Selecione a conta</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field" htmlFor="conta_destino_id">Conta de Destino</label>
            <select id="conta_destino_id" name="conta_destino_id" required defaultValue="" className="input-field">
              <option value="">Selecione a conta</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>
      ) : formaPagamento === 'credito' && aba === 'despesa' ? (
        <div>
          <label className="label-field" htmlFor="cartao_id">Cartão</label>
          <select id="cartao_id" name="cartao_id" required defaultValue={transacao?.cartao_id ?? ''} className="input-field">
            <option value="">Selecione o cartão</option>
            {cartoes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="label-field" htmlFor="conta_id">Conta</label>
          <select id="conta_id" name="conta_id" required defaultValue={transacao?.conta_id ?? ''} className="input-field">
            <option value="">Selecione a conta</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      )}

      {aba !== 'transferencia' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field" htmlFor="categoria_id">Categoria</label>
            <select
              id="categoria_id"
              name="categoria_id"
              required
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="input-field"
            >
              <option value="">Selecione...</option>
              {categoriasFiltradas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field" htmlFor="subcategoria_id">Subcategoria</label>
            <select
              id="subcategoria_id"
              name="subcategoria_id"
              defaultValue={transacao?.subcategoria_id ?? ''}
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
      )}

      {aba !== 'transferencia' && !transacao && (
        <div className="flex items-center gap-2">
          <input
            id="recorrente"
            name="recorrente"
            type="checkbox"
            checked={recorrente}
            onChange={(e) => setRecorrente(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          <label htmlFor="recorrente" className="text-sm text-gray-700">Transação Recorrente</label>
        </div>
      )}

      {recorrente && aba !== 'transferencia' && !transacao && (
        <div>
          <label className="label-field" htmlFor="meses_recorrencia">Repetir por quantos meses?</label>
          <input
            id="meses_recorrencia"
            name="meses_recorrencia"
            type="number"
            min="2"
            max="60"
            defaultValue={2}
            className="input-field"
          />
        </div>
      )}

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <BotaoSalvar label={transacao ? 'Salvar alterações' : 'Salvar Transação'} />
      </div>
    </form>
  );
}
