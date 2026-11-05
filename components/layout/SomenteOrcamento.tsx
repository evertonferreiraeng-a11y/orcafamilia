'use client';

import { usePathname } from 'next/navigation';
import { appDaRota } from '@/components/layout/Sidebar';

/** Mostra o conteúdo apenas nas telas do app Orçamento Familiar (ex.: seletor de mês da Topbar). */
export function SomenteOrcamento({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return appDaRota(pathname) === 'orcamento' ? <>{children}</> : null;
}
