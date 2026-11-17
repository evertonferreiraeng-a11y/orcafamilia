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
  const [situacao, setSituacao] = useState<'ativa' | 'standby'>(divida?.situacao ?? 'standby');
  const subcategoriasFiltradas = subcategorias.filter((s) => s.categoria_id === categoriaId);
  const [valorOriginal, setValorOriginal] = useState(divida?.valor_original != null ? String(divida.valor_original) : '');
  const [comJuros, setComJuros] = useState(
    divida ? String(divida.valor_atual != null ? divida.valor_atual : divida.valor_total) : ''
  );
  const [comDesconto, setComDesconto] = useState(divida?.valor_com_desconto != null ? String(divida.valor_com_desconto) : '');
  const n = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
  const pct = percentualDesconto(n(comJuros), n(comDesconto));

  // Acompanhamento do pagamento (só quando ativa)
  const valorPagarInicial = divida && divida.situacao === 'ativa' ? String(divida.valor_total) : '';
  const [valorPagar, setValorPagar] = useState(valorPagarInicial);
  const [parcelas, setParcelas] = useState(divida?.parcelas_total != null ? String(divida.parcelas_total) : '');
  const [valorParcela, setValorParcela] = useState(divida?.parcela_mensal != null ? String(divida.parcela_mensal) : '');
  const [parcelaEditada, setParcelaEditada] = useState(divida?.parcela_mensal != null);
  const [pagas, setPagas] = useState(divida?.parcelas_pagas != null ? String(divida.parcelas_pagas) : '0');
  const [pagasEditadas, setPagasEditadas] = useState(false);
  const totalPagarNum = n(valorPagar) ?? n(comDesconto) ?? n(comJuros);
  const parcelaCalculada = totalPagarNum && n(parcelas) ? Math.round((totalPagarNum / n(parcelas)!) * 100) / 100 : null;
  const parcelaExibida = parcelaEditada ? valorParcela : parcelaCalculada != null ? String(parcelaCalculada) : '';

  function escolherSituacao(nova: 'ativa' | 'standby') {
    setSituacao(nova);
    // ao ativar, sugere pagar o valor com desconto (ou com juros)
    if (nova === 'ativa' && !valorPagar) setValorPagar(comDesconto || comJuros);
  }

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
            <label className="label-field" htmlFor="valor_atual">Valor com juros</label>
            <input
              id="valor_atual"
              name="valor_atual"
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

      <div>
        <label className="label-field">Situação</label>
        <input type="hidden" name="situacao" value={situacao} />
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['standby', '📡 Em standby', 'só no radar'],
              ['ativa', '💳 Ativa', 'estou pagando'],
            ] as const
          ).map(([id, rotulo, sub]) => (
            <button
              key={id}
              type="button"
              onClick={() => escolherSituacao(id)}
              className={
                situacao === id
                  ? 'rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-2 text-left'
                  : 'rounded-xl border-2 border-transparent bg-gray-100 px-4 py-2 text-left hover:bg-gray-200/70'
              }
            >
              <span className={situacao === id ? 'block text-sm font-semibold text-brand-700' : 'block text-sm font-medium text-gray-700'}>{rotulo}</span>
              <span className="block text-[11px] text-gray-500">{sub}</span>
            </button>
          ))}
        </div>
      </div>

      {situacao === 'ativa' && (
        <div className="anim-subir space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Acompanhamento do pagamento</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field" htmlFor="valor_pagar">Valor a pagar (acordo)</label>
              <input
                id="valor_pagar"
                name="valor_pagar"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={valorPagar}
                onChange={(e) => setValorPagar(e.target.value)}
                className="input-field"
                placeholder="total a pagar"
              />
            </div>
            <div>
              <label className="label-field" htmlFor="data_vencimento">Próximo vencimento</label>
              <input
                id="data_vencimento"
                name="data_vencimento"
                type="date"
                defaultValue={divida?.data_vencimento ?? undefined}
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field" htmlFor="parcelas_total">Parcelas</label>
              <input
                id="parcelas_total"
                name="parcelas_total"
                type="number"
                min="1"
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                className="input-field"
                placeholder="ex.: 12"
              />
            </div>
            <div>
              <label className="label-field" htmlFor="parcela_mensal">Valor da parcela</label>
              <input
                id="parcela_mensal"
                name="parcela_mensal"
                type="number"
                step="0.01"
                min="0"
                value={parcelaExibida}
                onChange={(e) => {
                  setParcelaEditada(true);
                  setValorParcela(e.target.value);
                }}
                className="input-field"
                placeholder="calculado"
              />
            </div>
            <div>
              <label className="label-field" htmlFor="parcelas_pagas">Já pagas</label>
              <input
                id="parcelas_pagas"
                {...(pagasEditadas ? { name: 'parcelas_pagas' } : {})}
                type="number"
                min="0"
                value={pagas}
                onChange={(e) => {
                  setPagasEditadas(true);
                  setPagas(e.target.value);
                }}
                className="input-field"
              />
            </div>
          </div>
          {totalPagarNum != null && n(parcelas) != null && (
            <p className="text-xs text-gray-600">
              {n(parcelas)}× de {formatCurrency(n(parcelaExibida) ?? 0)}
              {n(pagas) ? ` · ${n(pagas)} paga(s), faltam ${Math.max(0, n(parcelas)! - n(pagas)!)}` : ''}
              {' · '}as transações você lança manualmente.
            </p>
          )}
        </div>
      )}

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
