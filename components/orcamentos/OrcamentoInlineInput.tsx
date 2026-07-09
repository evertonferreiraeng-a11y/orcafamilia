'use client';

import { useState } from 'react';
import { salvarOrcamento } from '@/app/(dashboard)/orcamentos/actions';
import { Modal } from '@/components/ui/Modal';
import { cn, formatCurrency } from '@/lib/utils';

export function OrcamentoInlineInput({
  categoriaId,
  subcategoriaId,
  mesReferencia,
  valorInicial,
  label,
  className,
}: {
  categoriaId: string;
  subcategoriaId: string | null;
  mesReferencia: string;
  valorInicial: number | null;
  label: string;
  className?: string;
}) {
  const valorTexto = valorInicial != null ? String(valorInicial) : '';
  const [valor, setValor] = useState(valorTexto);
  const [salvo, setSalvo] = useState(valorTexto);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [escopo, setEscopo] = useState<'mes' | 'futuro'>('mes');
  const [quantidadeMeses, setQuantidadeMeses] = useState(12);

  function onBlur() {
    if (valor === salvo) return;
    setModalAberto(true);
  }

  function cancelar() {
    setValor(salvo);
    setModalAberto(false);
    setEscopo('mes');
  }

  async function confirmar() {
    setModalAberto(false);
    setSalvando(true);
    setErro(null);
    const numero = valor.trim() === '' ? null : Number(valor);
    const meses = escopo === 'futuro' ? Math.max(2, Math.min(36, quantidadeMeses)) : 1;
    const resultado = await salvarOrcamento(categoriaId, subcategoriaId, mesReferencia, numero, meses);
    setSalvando(false);
    setEscopo('mes');
    if (resultado.error) {
      setErro(resultado.error);
      return;
    }
    setSalvo(valor);
  }

  const numeroAtual = valor.trim() === '' ? 0 : Number(valor);

  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        min="0"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={onBlur}
        placeholder="0,00"
        className={cn(
          'w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 transition-opacity focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
          salvando && 'opacity-60',
          className
        )}
      />
      {erro && <p className="absolute left-0 top-full z-10 mt-0.5 whitespace-nowrap text-xs text-negative">{erro}</p>}

      <Modal open={modalAberto} onClose={cancelar} title="Aplicar orçamento">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Definir <span className="font-semibold text-gray-900">{label}</span> como{' '}
            <span className="font-semibold text-gray-900">{formatCurrency(numeroAtual)}</span>. Aplicar esse valor para:
          </p>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 p-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input
                type="radio"
                name="escopo"
                checked={escopo === 'mes'}
                onChange={() => setEscopo('mes')}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500"
              />
              Somente este mês
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 p-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input
                type="radio"
                name="escopo"
                checked={escopo === 'futuro'}
                onChange={() => setEscopo('futuro')}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500"
              />
              Este mês e os próximos
            </label>
          </div>

          {escopo === 'futuro' && (
            <div>
              <label className="label-field" htmlFor="quantidade_meses">
                Por quantos meses (incluindo este)?
              </label>
              <input
                id="quantidade_meses"
                type="number"
                min={2}
                max={36}
                value={quantidadeMeses}
                onChange={(e) => setQuantidadeMeses(Number(e.target.value))}
                className="input-field"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={cancelar} className="btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={confirmar} className="btn-primary">
              Salvar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
