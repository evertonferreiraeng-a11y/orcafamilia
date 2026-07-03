import { NotificationBell } from '@/components/layout/NotificationBell';
import { UserMenu } from '@/components/layout/UserMenu';
import type { NotificacaoLog } from '@/types/database';

export function Topbar({
  nome,
  email,
  notificacoes,
  titulo,
  children,
}: {
  nome: string;
  email: string;
  notificacoes: NotificacaoLog[];
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
      <h1 className="text-lg font-semibold text-gray-900">{titulo}</h1>

      <div className="flex items-center gap-3">
        {children}
        <NotificationBell notificacoes={notificacoes} />
        <UserMenu nome={nome} email={email} />
      </div>
    </header>
  );
}
