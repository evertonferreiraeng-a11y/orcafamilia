'use client';

import { useRef, useState } from 'react';
import { IconImagem } from '@/components/icons';

const TAMANHO_MAXIMO = 5 * 1024 * 1024;

export function ImagemMetaInput({ imagemAtual }: { imagemAtual?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(imagemAtual ?? null);
  const [erro, setErro] = useState<string | null>(null);

  function aplicarArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro('A imagem deve ter no máximo 5MB.');
      return;
    }
    setErro(null);
    setPreview(URL.createObjectURL(arquivo));
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const arquivo = e.dataTransfer.files?.[0];
    if (!arquivo || !inputRef.current) return;
    const lista = new DataTransfer();
    lista.items.add(arquivo);
    inputRef.current.files = lista.files;
    aplicarArquivo(arquivo);
  }

  return (
    <div>
      <label className="label-field">Imagem da meta</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-6 text-center transition-colors hover:border-brand-300"
      >
        <input
          ref={inputRef}
          type="file"
          name="imagem"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => aplicarArquivo(e.target.files?.[0])}
          className="hidden"
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Pré-visualização da meta" className="h-32 w-32 rounded-xl object-cover" />
        ) : (
          <IconImagem className="h-8 w-8 text-gray-300" />
        )}
        <p className="text-sm text-gray-500">Clique aqui ou arraste uma imagem</p>
        <p className="text-xs text-gray-400">JPG, PNG ou WebP (máx. 5MB)</p>
      </div>
      {erro && <p className="mt-1 text-xs text-negative">{erro}</p>}
    </div>
  );
}
