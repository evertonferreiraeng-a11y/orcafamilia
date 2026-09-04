'use client';

import { useState, useTransition } from 'react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { IconCofre, IconEdit, IconDepositar, IconRetirar, IconCadeado, IconChevronDown } from '@/components/icons';
import { excluirCofre, excluirMovimentacaoCofre, verificarSenhaCofre } from '@/app/(dashboard)/cofre/actions';
import type { CofreSeguro } from '@/components/cofre/types';
import type { CofreMovimentacao, TipoMovimentacaoCofre } from '@/types/database';

export function CofreCard({
  cofre,
  historico,
  onEditar,
  onMovimentar,
}: {
  cofre: CofreSeguro;
  historico: CofreMovimentacao[];
  onEditar: (cofre: CofreSeguro) => void;
  onMovimentar: (cofre: CofreSeguro, tipo: TipoMovimentacaoCofre) => void;
}) {
  const protegido = cofre.protegido;
  const [desbloqueado, setDesbloqueado] = useState(!protegido);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [verificando, startVerificacao] = useTransition();
  const [expandido, setExpandido] = useState(false);

  function tentarDesbloquear(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    startVerificacao(async () => {
      const resultado = await verificarSenhaCofre(cofre.id, senha);
      if (resultado.ok) {
        setDesbloqueado(true);
        setSenha('');
      } else {
        setErro('Senha incorreta.');
      }
    });
  }

  const cor = cofre.cor ?? '#2a78d6';

  return (
    <div className="card p-4 transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${cor}1a`, color: cor }}
            >
              <IconCofre className="h-7 w-7" />
            </span>
            {protegido && (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-white ring-2 ring-white">
                <IconCadeado className="h-3 w-3" />
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{cofre.nome}</p>
            {cofre.descricao && <p className="text-xs text-gray-400">{cofre.descricao}</p>}
          </div>
        </div>
        {desbloqueado && (
          <button
            type="button"
            onClick={() => onEditar(cofre)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Editar"
          >
            <IconEdit className="h-4 w-4" />
          </button>
        )}
      </div>

      {!desbloqueado ? (
        <form onSubmit={tentarDesbloquear} className="mt-4 space-y-2">
          <p className="text-xs text-gray-400">Protegido por senha</p>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Digite a senha"
            className="input-field"
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
        <>
          <p className="mt-4 text-xs text-gray-400">Saldo guardado</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(Number(cofre.saldo))}</p>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => onMovimentar(cofre, 'deposito')} className="btn-secondary flex-1">
              <IconDepositar className="h-4 w-4" />
              Depositar
            </button>
            <button
              type="button"
              onClick={() => onMovimentar(cofre, 'retirada')}
              disabled={Number(cofre.saldo) <= 0}
              className="btn-secondary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconRetirar className="h-4 w-4" />
              Retirar
            </button>
            <DeleteButton
              action={() => excluirCofre(cofre.id)}
              confirmMessage="Excluir este cofre e todo o histórico de movimentações?"
            />
          </div>

          {historico.length > 0 && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setExpandido((atual) => !atual)}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                {expandido ? 'Ocultar histórico' : `Ver histórico (${historico.length})`}
                <IconChevronDown className={cn('h-3.5 w-3.5 transition-transform', expandido && 'rotate-180')} />
              </button>

              {expandido && (
                <div className="mt-2 space-y-1.5">
                  {historico.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                      <p className="min-w-0 text-gray-600">
                        {formatDate(m.data)}
                        {m.descricao ? ` · ${m.descricao}` : ''}
                      </p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={cn('font-semibold', m.tipo === 'deposito' ? 'text-positive' : 'text-negative')}
                        >
                          {m.tipo === 'deposito' ? '+' : '-'} {formatCurrency(Number(m.valor))}
                        </span>
                        <DeleteButton
                          action={() => excluirMovimentacaoCofre(m.id, cofre.id)}
                          confirmMessage="Excluir esta movimentação?"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
