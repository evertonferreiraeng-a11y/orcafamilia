'use client';

import { useState } from 'react';
import { salvarOrcamento } from '@/app/(dashboard)/orcamentos/actions';
import { cn } from '@/lib/utils';

export function OrcamentoInlineInput({
  categoriaId,
  subcategoriaId,
  mesReferencia,
  valorInicial,
  className,
}: {
  categoriaId: string;
  subcategoriaId: string | null;
  mesReferencia: string;
  valorInicial: number | null;
  className?: string;
}) {
  const valorTexto = valorInicial != null ? String(valorInicial) : '';
  const [valor, setValor] = useState(valorTexto);
  const [salvo, setSalvo] = useState(valorTexto);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (valor === salvo) return;
    setSalvando(true);
    setErro(null);
    const numero = valor.trim() === '' ? null : Number(valor);
    const resultado = await salvarOrcamento(categoriaId, subcategoriaId, mesReferencia, numero);
    setSalvando(false);
    if (resultado.error) {
      setErro(resultado.error);
      return;
    }
    setSalvo(valor);
  }

  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        min="0"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={salvar}
        placeholder="0,00"
        className={cn(
          'w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 transition-opacity focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
          salvando && 'opacity-60',
          className
        )}
      />
      {erro && <p className="absolute left-0 top-full z-10 mt-0.5 whitespace-nowrap text-xs text-negative">{erro}</p>}
    </div>
  );
}
