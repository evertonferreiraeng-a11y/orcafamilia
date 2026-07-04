'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import type { NotificacaoLog } from '@/types/database';

const STORAGE_KEY = 'orcafamilia:sidebar-aberta';

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
  const [desktopOpen, setDesktopOpen] = useState(true);

  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo !== null) setDesktopOpen(salvo === 'true');
  }, []);

  function alternarSidebarDesktop() {
    setDesktopOpen((atual) => {
      const novo = !atual;
      localStorage.setItem(STORAGE_KEY, String(novo));
      return novo;
    });
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} desktopOpen={desktopOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          nome={nome}
          email={email}
          notificacoes={notificacoes}
          onMenuClick={() => setMobileOpen(true)}
          onToggleSidebar={alternarSidebarDesktop}
          sidebarOpen={desktopOpen}
        >
          {topbarSlot}
        </Topbar>
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
