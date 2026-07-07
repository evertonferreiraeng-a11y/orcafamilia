'use client';

import { useState } from 'react';

export function CodigoFamilia({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="card space-y-3 p-5">
      <h2 className="text-sm font-semibold text-gray-700">Convidar cônjuge</h2>
      <p className="text-xs text-gray-400">
        Compartilhe este código com seu cônjuge. No cadastro dele(a), escolha &quot;Entrar em família&quot; e informe este código.
      </p>
      <div className="flex items-center gap-2">
        <code className="input-field select-all bg-gray-50 text-gray-700">{codigo}</code>
        <button type="button" onClick={copiar} className="btn-secondary shrink-0">
          {copiado ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}
