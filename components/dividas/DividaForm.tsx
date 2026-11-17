'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { Divida, Categoria, Subcategoria, Conta } from '@/types/database';
import type { DividaFormState } from '@/app/(dashboard)/dividas/actions';
import { SITUACOES_CREDITO, TIPOS_DIVIDA, valorComDesconto, variacaoOriginalAtual } from '@/lib/dividas';
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
  const [gerarParcelas, setGerarParcelas] = useState(false);
  const [semVencimento, setSemVencimento] = useState(divida?.sem_vencimento ?? false);
  const subcategoriasFiltradas = subcategorias.filter((s) => s.categoria_id === categoriaId);
  const [valorOriginal, setValorOriginal] = useState(divida?.valor_original != null ? String(divida.valor_original) : '');
  const [valorAtual, setValorAtual] = useState(divida?.valor_atual != null ? String(divida.valor_atual) : '');
  const [desconto, setDesconto] = useState(divida?.desconto_pct != null ? String(divida.desconto_pct) : '');
  const n = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
  const comDesconto = valorComDesconto(n(valorAtual), n(desconto));
  const variacao = variacaoOriginalAtual(n(valorOriginal), n(valorAtual));

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

      <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Detalhes para negociação</p>
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
            <label className="label-field" htmlFor="valor_atual">Valor atual</label>
            <input
              id="valor_atual"
              name="valor_atual"
              type="number"
              step="0.01"
              min="0"
              value={valorAtual}
              onChange={(e) => setValorAtual(e.target.value)}
              className="input-field"
              placeholder="cobrado hoje"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="desconto_pct">Desconto (%)</label>
            <input
              id="desconto_pct"
              name="desconto_pct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              className="input-field"
              placeholder="ex.: 60"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field" htmlFor="taxa_juros_mensal">Juros (% ao mês)</label>
            <input
              id="taxa_juros_mensal"
              name="taxa_juros_mensal"
              type="number"
              step="0.001"
              min="0"
              max="100"
              defaultValue={divida?.taxa_juros_mensal ?? ''}
              className="input-field"
              placeholder="ex.: 2,5 (CET mensal)"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="parcela_mensal">Parcela mensal</label>
            <input
              id="parcela_mensal"
              name="parcela_mensal"
              type="number"
              step="0.01"
              min="0"
              defaultValue={divida?.parcela_mensal ?? ''}
              className="input-field"
              placeholder="pagamento mínimo"
            />
          </div>
        </div>
        {(variacao != null || comDesconto != null) && (
          <div className="space-y-0.5 text-xs">
            {variacao != null && (
              <p className={variacao > 0 ? 'text-red-600' : 'text-emerald-700'}>
                {variacao > 0 ? '📈' : '📉'} O valor atual está {Math.abs(variacao).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% {variacao > 0 ? 'acima' : 'abaixo'} do original.
              </p>
            )}
            {comDesconto != null && n(valorAtual) != null && (
              <p className="font-semibold text-emerald-700">
                🤝 Para quitar com desconto: {formatCurrency(comDesconto)} (economia de {formatCurrency(n(valorAtual)! - comDesconto)})
              </p>
            )}
          </div>
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

      {!divida && !semVencimento && (
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
