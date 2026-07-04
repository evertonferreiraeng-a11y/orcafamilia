import { NotificationBell } from '@/components/layout/NotificationBell';
import { UserMenu } from '@/components/layout/UserMenu';
import { IconMenu } from '@/components/icons';
import type { NotificacaoLog } from '@/types/database';

export function Topbar({
  nome,
  email,
  notificacoes,
  onMenuClick,
  children,
}: {
  nome: string;
  email: string;
  notificacoes: NotificacaoLog[];
  onMenuClick?: () => void;
  children?: React.ReactNode;
}) {
  const primeiroNome = nome.split(' ')[0];

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label="Abrir menu"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Olá, {primeiroNome}</h1>
      </div>

      <div className="flex items-center gap-3">
        {children}
        <NotificationBell notificacoes={notificacoes} />
        <UserMenu nome={nome} email={email} />
      </div>
    </header>
  );
}
