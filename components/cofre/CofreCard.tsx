'use client';

import { useState, useTransition } from 'react';
import { formatCurrency } from '@/lib/utils';
import { IconCadeado } from '@/components/icons';
import { verificarSenhaCofre } from '@/app/(dashboard)/cofre/actions';
import type { CofreSeguro } from '@/components/cofre/types';

export function CofreCard({
  cofre,
  desbloqueado,
  onDesbloquear,
  onAbrir,
}: {
  cofre: CofreSeguro;
  desbloqueado: boolean;
  onDesbloquear: () => void;
  onAbrir: () => void;
}) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [verificando, startVerificacao] = useTransition();

  const cor = cofre.cor ?? '#2a78d6';
  const bloqueado = cofre.protegido && !desbloqueado;

  function tentarDesbloquear(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    startVerificacao(async () => {
      const resultado = await verificarSenhaCofre(cofre.id, senha);
      if (resultado.ok) {
        setSenha('');
        onDesbloquear();
        onAbrir();
      } else {
        setErro('Senha incorreta.');
      }
    });
  }

  return (
    <div className="card flex flex-col items-center p-5 text-center transition-shadow hover:shadow-elevated">
      <div
        className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.35),inset_0_-6px_10px_rgba(0,0,0,0.3)]"
        style={{ backgroundColor: cor }}
      >
        <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-white/40" />
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white/70">
          <div className="h-4 w-1 rounded-full bg-white/80" />
        </div>
        {cofre.protegido && (
          <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-white ring-2 ring-white">
            <IconCadeado className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <p className="mt-3 font-semibold text-gray-900">{cofre.nome}</p>
      {cofre.descricao && <p className="text-xs text-gray-400">{cofre.descricao}</p>}

      {bloqueado ? (
        <form onSubmit={tentarDesbloquear} className="mt-3 w-full space-y-2">
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Digite a senha"
            className="input-field text-center"
          />
          {erro && <p className="text-xs text-negative">{erro}</p>}
          <button
            type="submit"
            disabled={verificando || !senha}
            className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verificando ? 'Verificando...' : 'Desbloquear'}
          </button>
        </form>
      ) : (
        <button type="button" onClick={onAbrir} className="mt-3 w-full">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(Number(cofre.saldo))}</p>
          <p className="text-xs font-medium text-brand-600">Toque para abrir</p>
        </button>
      )}
    </div>
  );
}
