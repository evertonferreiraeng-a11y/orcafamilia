'use client';

import { NotificationBell } from '@/components/layout/NotificationBell';
import { UserMenu } from '@/components/layout/UserMenu';
import { useSaldoVisibilidade } from '@/components/layout/SaldoVisibilidadeContext';
import { IconMenu, IconSidebarClose, IconSidebarOpen, IconEye, IconEyeOff } from '@/components/icons';
import type { NotificacaoLog } from '@/types/database';

export function Topbar({
  nome,
  email,
  notificacoes,
  onMenuClick,
  onToggleSidebar,
  sidebarOpen = true,
  children,
}: {
  nome: string;
  email: string;
  notificacoes: NotificacaoLog[];
  onMenuClick?: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  children?: React.ReactNode;
}) {
  const primeiroNome = nome.split(' ')[0];
  const { visivel, alternar } = useSaldoVisibilidade();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-100 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 md:hidden"
          aria-label="Abrir menu"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-200 md:inline-flex"
          aria-label={sidebarOpen ? 'Ocultar menu lateral' : 'Mostrar menu lateral'}
        >
          {sidebarOpen ? <IconSidebarClose className="h-5 w-5" /> : <IconSidebarOpen className="h-5 w-5" />}
        </button>
        <h1 className="text-base font-semibold text-gray-900">Olá, {primeiroNome}</h1>
      </div>

      <div className="flex items-center gap-3">
        {children}
        <button
          type="button"
          onClick={alternar}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-200"
          aria-label={visivel ? 'Ocultar saldos' : 'Mostrar saldos'}
        >
          {visivel ? <IconEye className="h-5 w-5" /> : <IconEyeOff className="h-5 w-5" />}
        </button>
        <NotificationBell notificacoes={notificacoes} />
        <UserMenu nome={nome} email={email} />
      </div>
    </header>
  );
}
