'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import type { NotificacaoLog } from '@/types/database';

export function DashboardShell({
  nome,
  email,
  notificacoes,
  topbarSlot,
  children,
}: {
  nome: string;
  email: string;
  notificacoes: NotificacaoLog[];
  topbarSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar nome={nome} email={email} notificacoes={notificacoes} onMenuClick={() => setMobileOpen(true)}>
          {topbarSlot}
        </Topbar>
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
