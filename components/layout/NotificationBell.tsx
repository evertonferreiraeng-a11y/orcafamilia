'use client';

import { useState } from 'react';
import { IconBell } from '@/components/icons';
import type { NotificacaoLog } from '@/types/database';

function formatarQuando(data: string): string {
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationBell({ notificacoes }: { notificacoes: NotificacaoLog[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="relative rounded-full p-2 text-gray-500 hover:bg-gray-200"
        aria-label="Notificações"
      >
        <IconBell className="h-5 w-5" />
        {notificacoes.length > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-negative" />
        )}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-gray-100 bg-white p-2 shadow-elevated">
            <p className="px-3 py-2 text-xs font-semibold uppercase text-gray-400">Notificações recentes</p>
            {notificacoes.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400">Nenhuma notificação por aqui.</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {notificacoes.map((n) => (
                  <li key={n.id} className="rounded-xl px-3 py-2 text-sm hover:bg-gray-50">
                    <p className="text-gray-800">{n.mensagem}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{formatarQuando(n.enviado_em)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
