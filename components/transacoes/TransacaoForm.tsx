'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { Categoria, Subcategoria, Conta, Cartao, Transacao, TipoDespesa } from '@/types/database';
import type { TransacaoFormState } from '@/app/(dashboard)/transacoes/actions';
import { OrcamentoDisponivel } from '@/components/transacoes/OrcamentoDisponivel';
import { cn, formatCurrency } from '@/lib/utils';

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

const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function nomeMesComOffset(dataStr: string, offset: number): string {
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  if (!ano || !mes || !dia) return '';
  const data = new Date(ano, mes - 1 + offset, 1);
  return `${NOMES_MESES[data.getMonth()]}/${data.getFullYear()}`;
}

export function TransacaoForm({
  action,
  categorias,
  subcategorias,
  contas,
  cartoes,
  transacao,
  temProximasParcelas,
  onSucesso,
}: {
  action: (state: TransacaoFormState, formData: FormData) => Promise<TransacaoFormState>;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  contas: Conta[];
  cartoes: Cartao[];
  transacao?: Transacao;
  temProximasParcelas?: boolean;
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
  const [subcategoriaId, setSubcategoriaId] = useState(transacao?.subcategoria_id ?? '');
  const [valorDigitado, setValorDigitado] = useState(transacao?.valor != null ? String(transacao.valor) : '');
  const [dataPagamento, setDataPagamento] = useState(transacao?.pago ? transacao?.data ?? '' : '');
  const [pago, setPago] = useState(transacao?.pago ?? false);
  const [tipoDespesa, setTipoDespesa] = useState<TipoDespesa>(transacao?.tipo_despesa ?? 'variavel');
  const [parcelado, setParcelado] = useState(false);
  const [escopo, setEscopo] = useState<'somente' | 'futuras'>('somente');
  const [dataVencimento, setDataVencimento] = useState(
    transacao?.data_vencimento ?? transacao?.data ?? new Date().toISOString().slice(0, 10)
  );
  const [duplicarAtivo, setDuplicarAtivo] = useState(false);
  const [mesesDuplicar, setMesesDuplicar] = useState<Set<number>>(new Set());
  const [mesesFixaSelecionados, setMesesFixaSelecionados] = useState<Set<number>>(new Set());

  const ehParteDeParcelamento = Boolean(temProximasParcelas);

  function alternarMesDuplicar(offset: number) {
    setMesesDuplicar((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(offset)) proximo.delete(offset);
      else proximo.add(offset);
      return proximo;
    });
  }

  function alternarMesFixa(offset: number) {
    setMesesFixaSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(offset)) proximo.delete(offset);
      else proximo.add(offset);
      return proximo;
    });
  }

  const tipoLancamento: 'despesa' | 'receita' = aba === 'transferencia' ? 'despesa' : aba;
  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipoLancamento);
  const subcategoriasFiltradas = subcategorias.filter((s) => s.categoria_id === categoriaId);

  /* ---------- etapas ---------- */
  const temEtapaRepeticao = aba !== 'transferencia' && (!transacao || ehParteDeParcelamento);
  const etapas: { n: number; titulo: string; emoji: string }[] = [
    { n: 1, titulo: 'O que é', emoji: '📝' },
    { n: 2, titulo: aba === 'transferencia' ? 'Quando e contas' : 'Quando e onde', emoji: '📅' },
    ...(aba !== 'transferencia' ? [{ n: 3, titulo: 'Categoria', emoji: '🏷️' }] : []),
    ...(temEtapaRepeticao ? [{ n: 4, titulo: transacao ? 'Aplicar em' : 'Repetição', emoji: '🔁' }] : []),
  ];
  const [etapa, setEtapa] = useState(1);
  const [maxVisitada, setMaxVisitada] = useState(transacao ? 4 : 1);
  const formRef = useRef<HTMLFormElement>(null);
  const idx = Math.max(0, etapas.findIndex((e) => e.n === etapa));
  const ultima = idx === etapas.length - 1;

  // Se a etapa atual deixar de existir (ex.: mudou para Transferência), volta para a última válida.
  useEffect(() => {
    if (!etapas.some((e) => e.n === etapa)) setEtapa(etapas[etapas.length - 1].n);
  }, [etapas, etapa]);

  // Foca o primeiro campo da etapa ao entrar nela.
  useEffect(() => {
    const el = formRef.current?.querySelector<HTMLElement>(`[data-etapa="${etapa}"] input:not([type=hidden]):not([type=checkbox]), [data-etapa="${etapa}"] select`);
    el?.focus({ preventScroll: true });
  }, [etapa]);

  function etapaValida(n: number): boolean {
    const box = formRef.current?.querySelector(`[data-etapa="${n}"]`);
    if (!box) return true;
    const campos = Array.from(box.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')).filter((c) => !c.disabled);
    for (const c of campos) {
      if (!c.checkValidity()) {
        c.reportValidity();
        return false;
      }
    }
    return true;
  }

  function irPara(n: number) {
    // Para avançar, todas as etapas anteriores precisam estar válidas.
    for (const e of etapas) {
      if (e.n >= n) break;
      if (e.n >= etapa && !etapaValida(e.n)) {
        setEtapa(e.n);
        return;
      }
    }
    setEtapa(n);
    setMaxVisitada((m) => Math.max(m, n));
  }

  const proxima = () => !ultima && irPara(etapas[idx + 1].n);
  const anterior = () => idx > 0 && setEtapa(etapas[idx - 1].n);

  const categoriaNome = categorias.find((c) => c.id === categoriaId)?.nome;
  const subNome = subcategorias.find((sc) => sc.id === subcategoriaId)?.nome;
  const valorNum = Number(valorDigitado.replace(',', '.'));
  const caixa = (n: number) => cn(etapa === n ? 'anim-subir space-y-4' : 'hidden');

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4"
      onInvalidCapture={(e) => {
        // Campo inválido numa etapa escondida: leva até ela.
        const box = (e.target as HTMLElement).closest<HTMLElement>('[data-etapa]');
        const n = Number(box?.dataset.etapa);
        if (n && n !== etapa) setEtapa(n);
      }}
      onKeyDown={(e) => {
        const alvo = e.target as HTMLElement;
        if (e.key === 'Enter' && !ultima && alvo.tagName === 'INPUT' && (alvo as HTMLInputElement).type !== 'checkbox') {
          e.preventDefault();
          proxima();
        }
      }}
    >
      <input type="hidden" name="aba" value={aba} />

      {/* progresso */}
      <div className="-mt-1">
        <div className="flex items-center gap-1">
          {etapas.map((e, i) => {
            const feita = i < idx;
            const atual = i === idx;
            const clicavel = e.n <= maxVisitada || i <= idx;
            return (
              <button
                key={e.n}
                type="button"
                onClick={() => clicavel && (i < idx ? setEtapa(e.n) : irPara(e.n))}
                disabled={!clicavel}
                className={cn('group flex min-w-0 flex-1 flex-col gap-1.5 text-left', !clicavel && 'cursor-default')}
              >
                <span className={cn('h-1.5 rounded-full transition-colors duration-300', feita || atual ? 'bg-brand-500' : 'bg-gray-200')} />
                <span className={cn('truncate text-[11px] font-medium', atual ? 'text-brand-700' : feita ? 'text-gray-600 group-hover:text-brand-600' : 'text-gray-400')}>
                  {e.emoji} {e.titulo}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div data-etapa="1" className={caixa(1)}>

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
          onChange={(e) => setValorDigitado(e.target.value)}
          className="input-field"
          placeholder="0,00"
        />
      </div>

      </div>

      <div data-etapa="2" className={caixa(2)}>
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field" htmlFor="data_vencimento">Data de Vencimento</label>
            <input
              id="data_vencimento"
              name="data_vencimento"
              type="date"
              required
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="data">Data de Pagamento</label>
            <input
              id="data"
              name="data"
              type="date"
              defaultValue={transacao?.pago ? transacao?.data ?? '' : ''}
              onChange={(e) => {
                setPago(e.target.value !== '');
                setDataPagamento(e.target.value);
              }}
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

      </div>

      <div data-etapa="3" className={caixa(3)}>
      {aba !== 'transferencia' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field" htmlFor="categoria_id">Categoria</label>
            <select
              id="categoria_id"
              name="categoria_id"
              required
              value={categoriaId}
              onChange={(e) => {
                setCategoriaId(e.target.value);
                setSubcategoriaId('');
              }}
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
              value={subcategoriaId}
              onChange={(e) => setSubcategoriaId(e.target.value)}
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

      {aba !== 'transferencia' && categoriaId && categoriasFiltradas.some((c) => c.id === categoriaId) && (
        <OrcamentoDisponivel
          categoriaId={categoriaId}
          categoriaNome={categorias.find((c) => c.id === categoriaId)?.nome ?? 'Categoria'}
          categoriaIcone={categorias.find((c) => c.id === categoriaId)?.icone ?? null}
          subcategoriaId={subcategoriaId || null}
          subcategoriaNome={subcategorias.find((sc) => sc.id === subcategoriaId)?.nome ?? null}
          mesRef={(dataPagamento || dataVencimento).slice(0, 7)}
          valor={Number(valorDigitado.replace(',', '.'))}
          receita={aba === 'receita'}
          excluirTransacaoId={transacao?.id}
        />
      )}

      {aba === 'despesa' && (
        <div>
          <label className="label-field">Tipo de Despesa</label>
          <input type="hidden" name="tipo_despesa" value={tipoDespesa} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipoDespesa('variavel')}
              className={
                tipoDespesa === 'variavel'
                  ? 'rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700'
                  : 'rounded-xl border-2 border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600'
              }
            >
              Variável
            </button>
            <button
              type="button"
              onClick={() => {
                setTipoDespesa('fixa');
                setParcelado(false);
                setMesesFixaSelecionados((atual) =>
                  atual.size === 0 ? new Set(Array.from({ length: 11 }, (_, i) => i + 1)) : atual
                );
              }}
              className={
                tipoDespesa === 'fixa'
                  ? 'rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700'
                  : 'rounded-xl border-2 border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600'
              }
            >
              Fixa
            </button>
          </div>
        </div>
      )}

      </div>

      <div data-etapa="4" className={caixa(4)}>
      {!transacao && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Resumo</p>
          <p className="mt-1 truncate text-base font-semibold text-gray-900">
            {(formRef.current?.querySelector<HTMLInputElement>('#descricao')?.value || ABA_LABEL[aba])}
          </p>
          <p className={cn('text-xl font-bold tabular-nums', aba === 'receita' ? 'text-positive' : 'text-gray-900')}>
            {valorNum > 0 ? formatCurrency(valorNum) : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            vence {dataVencimento.split('-').reverse().join('/')}
            {pago && ' · paga'}
            {categoriaNome && ` · ${categoriaNome}`}
            {subNome && ` › ${subNome}`}
          </p>
        </div>
      )}
      {aba === 'despesa' && !transacao && tipoDespesa === 'variavel' && (
        <div>
          <label className="label-field">Parcelamento</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setParcelado(false);
                setMesesFixaSelecionados(new Set());
              }}
              className={
                !parcelado
                  ? 'rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700'
                  : 'rounded-xl border-2 border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600'
              }
            >
              À vista
            </button>
            <button
              type="button"
              onClick={() => {
                setParcelado(true);
                setMesesFixaSelecionados((atual) => (atual.size === 0 ? new Set([1]) : atual));
              }}
              className={
                parcelado
                  ? 'rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700'
                  : 'rounded-xl border-2 border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600'
              }
            >
              Parcelada
            </button>
          </div>
        </div>
      )}

      {aba === 'despesa' && !transacao && (tipoDespesa === 'fixa' || parcelado) && (
        <div>
          <input
            type="hidden"
            name="meses_fixa_selecionados"
            value={Array.from(mesesFixaSelecionados).sort((a, b) => a - b).join(',')}
          />
          <div className="flex items-center justify-between">
            <label className="label-field mb-0">
              {tipoDespesa === 'fixa' ? 'Em quais meses este lançamento deve se repetir?' : 'Meses das próximas parcelas'}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMesesFixaSelecionados(new Set(Array.from({ length: 24 }, (_, i) => i + 1)))}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Marcar todos
              </button>
              <button
                type="button"
                onClick={() => setMesesFixaSelecionados(new Set())}
                className="text-xs font-medium text-gray-400 hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>
          <p className="mb-2 mt-1 text-xs text-gray-400">Este mês ({nomeMesComOffset(dataVencimento, 0)}) já está incluído.</p>
          <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-gray-100 p-2 sm:grid-cols-3">
            {Array.from({ length: 24 }, (_, i) => i + 1).map((offset) => {
              const selecionado = mesesFixaSelecionados.has(offset);
              return (
                <button
                  key={offset}
                  type="button"
                  onClick={() => alternarMesFixa(offset)}
                  className={
                    selecionado
                      ? 'rounded-xl border-2 border-brand-500 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700'
                      : 'rounded-xl border-2 border-transparent bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600'
                  }
                >
                  {nomeMesComOffset(dataVencimento, offset)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {mesesFixaSelecionados.size + 1} {mesesFixaSelecionados.size === 0 ? 'lançamento será criado' : 'lançamentos serão criados'} no total.
          </p>
        </div>
      )}

      {aba !== 'transferencia' && !transacao && !(aba === 'despesa' && (tipoDespesa === 'fixa' || parcelado)) && (
        <div>
          <input type="hidden" name="duplicar_meses" value={Array.from(mesesDuplicar).sort((a, b) => a - b).join(',')} />
          <div className="flex items-center gap-2">
            <input
              id="duplicar_ativo"
              type="checkbox"
              checked={duplicarAtivo}
              onChange={(e) => {
                setDuplicarAtivo(e.target.checked);
                if (!e.target.checked) setMesesDuplicar(new Set());
              }}
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="duplicar_ativo" className="text-sm text-gray-700">
              Duplicar este lançamento para os meses seguintes
            </label>
          </div>

          {duplicarAtivo && (
            <div className="mt-3">
              <p className="mb-2 text-xs text-gray-400">Selecione os meses para os quais deseja repetir este lançamento.</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((offset) => {
                  const selecionado = mesesDuplicar.has(offset);
                  return (
                    <button
                      key={offset}
                      type="button"
                      onClick={() => alternarMesDuplicar(offset)}
                      className={
                        selecionado
                          ? 'rounded-xl border-2 border-brand-500 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700'
                          : 'rounded-xl border-2 border-transparent bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600'
                      }
                    >
                      {nomeMesComOffset(dataVencimento, offset)}
                    </button>
                  );
                })}
              </div>
              {mesesDuplicar.size > 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  {mesesDuplicar.size} {mesesDuplicar.size === 1 ? 'cópia será criada' : 'cópias serão criadas'}, além deste lançamento.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {ehParteDeParcelamento && (
        <div>
          <label className="label-field">Aplicar alteração em</label>
          <input type="hidden" name="escopo" value={escopo} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEscopo('somente')}
              className={
                escopo === 'somente'
                  ? 'rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700'
                  : 'rounded-xl border-2 border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600'
              }
            >
              Somente esta
            </button>
            <button
              type="button"
              onClick={() => setEscopo('futuras')}
              className={
                escopo === 'futuras'
                  ? 'rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700'
                  : 'rounded-xl border-2 border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600'
              }
            >
              Esta e as próximas
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {escopo === 'futuras'
              ? 'Valor, categoria, conta/cartão e descrição serão atualizados nas próximas parcelas ainda não pagas.'
              : 'Apenas esta parcela será alterada.'}
          </p>
        </div>
      )}

      {aba !== 'transferencia' && !transacao && (
        <p className="text-xs text-gray-400">Se não for repetir, é só salvar.</p>
      )}
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        {idx > 0 && (
          <button type="button" onClick={anterior} className="btn-secondary">
            ← Voltar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {idx + 1} de {etapas.length}
        </span>
        {ultima ? (
          <BotaoSalvar label={transacao ? 'Salvar alterações' : 'Salvar Transação'} />
        ) : (
          <>
            {transacao && (
              <BotaoSalvar label="Salvar" />
            )}
            <button type="button" onClick={proxima} className={transacao ? 'btn-secondary' : 'btn-primary'}>
              Próximo →
            </button>
          </>
        )}
      </div>
    </form>
  );
}
