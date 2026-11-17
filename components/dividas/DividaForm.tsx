'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { Divida, Categoria, Subcategoria, Conta } from '@/types/database';
import type { DividaFormState } from '@/app/(dashboard)/dividas/actions';
import { SITUACOES_CREDITO, TIPOS_DIVIDA, percentualDesconto } from '@/lib/dividas';
import { formatCurrency } from '@/lib/utils';

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
  const [semVencimento, setSemVencimento] = useState(divida?.sem_vencimento ?? false);
  const subcategoriasFiltradas = subcategorias.filter((s) => s.categoria_id === categoriaId);
  const [valorOriginal, setValorOriginal] = useState(divida?.valor_original != null ? String(divida.valor_original) : '');
  const [comJuros, setComJuros] = useState(
    divida ? String(divida.valor_atual != null ? divida.valor_atual : divida.valor_total) : ''
  );
  const [comDesconto, setComDesconto] = useState(divida?.valor_com_desconto != null ? String(divida.valor_com_desconto) : '');
  const n = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
  const pct = percentualDesconto(n(comJuros), n(comDesconto));

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

      <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo e valores da dívida</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field" htmlFor="tipo_divida">Tipo da dívida</label>
            <select id="tipo_divida" name="tipo_divida" defaultValue={divida?.tipo_divida ?? ''} className="input-field">
              <option value="">Não informado</option>
              {Object.entries(TIPOS_DIVIDA).map(([k, t]) => (
                <option key={k} value={k}>
                  {t.emoji} {t.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field" htmlFor="situacao_credito">Situação no crédito</label>
            <select id="situacao_credito" name="situacao_credito" defaultValue={divida?.situacao_credito ?? ''} className="input-field">
              <option value="">Não informada</option>
              {Object.entries(SITUACOES_CREDITO).map(([k, t]) => (
                <option key={k} value={k}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-field" htmlFor="valor_original">Valor original</label>
            <input
              id="valor_original"
              name="valor_original"
              type="number"
              step="0.01"
              min="0"
              value={valorOriginal}
              onChange={(e) => setValorOriginal(e.target.value)}
              className="input-field"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="valor_total">Valor com juros</label>
            <input
              id="valor_total"
              name="valor_total"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={comJuros}
              onChange={(e) => setComJuros(e.target.value)}
              className="input-field"
              placeholder="cobrado hoje"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="valor_com_desconto">Valor com desconto</label>
            <input
              id="valor_com_desconto"
              name="valor_com_desconto"
              type="number"
              step="0.01"
              min="0"
              value={comDesconto}
              onChange={(e) => setComDesconto(e.target.value)}
              className="input-field"
              placeholder="proposta"
            />
          </div>
        </div>
        {pct != null && (
          <p className="text-xs font-semibold text-emerald-700">
            🤝 Desconto de {pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% · economia de {formatCurrency(n(comJuros)! - n(comDesconto)!)}
          </p>
        )}
        {n(comDesconto) != null && n(comJuros) != null && n(comDesconto)! >= n(comJuros)! && (
          <p className="text-xs text-amber-700">O valor com desconto deve ser menor que o valor com juros.</p>
        )}
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

      <div className="flex items-center gap-2">
        <input
          id="sem_vencimento"
          name="sem_vencimento"
          type="checkbox"
          checked={semVencimento}
          onChange={(e) => setSemVencimento(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        <label htmlFor="sem_vencimento" className="text-sm text-gray-700">
          Sem vencimento definido (só para ficar no radar)
        </label>
      </div>

      {!semVencimento && (
        <div>
          <label className="label-field" htmlFor="data_vencimento">Próximo vencimento</label>
          <input
            id="data_vencimento"
            name="data_vencimento"
            type="date"
            required
            defaultValue={divida?.data_vencimento ?? undefined}
            className="input-field"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field" htmlFor="situacao">Situação</label>
          <select
            id="situacao"
            name="situacao"
            defaultValue={divida?.situacao ?? 'ativa'}
            className="input-field"
          >
            <option value="ativa">Ativa</option>
            <option value="standby">Em standby</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor="observacoes">Observações</label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          defaultValue={divida?.observacoes ?? ''}
          className="input-field"
          placeholder="Observações sobre esta dívida (opcional)"
        />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <BotaoSalvar label={divida ? 'Salvar alterações' : 'Cadastrar dívida'} />
      </div>
    </form>
  );
}
