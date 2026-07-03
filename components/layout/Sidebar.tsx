'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconDashboard,
  IconTransacoes,
  IconOrcamentos,
  IconDividas,
  IconMetas,
  IconPrevisao,
  IconFamilia,
  IconCadastro,
  IconAjustes,
} from '@/components/icons';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { href: '/transacoes', label: 'Transações', icon: IconTransacoes },
  { href: '/orcamentos', label: 'Orçamentos', icon: IconOrcamentos },
  { href: '/dividas', label: 'Dívidas', icon: IconDividas },
  { href: '/metas', label: 'Metas', icon: IconMetas },
  { href: '/previsao', label: 'Previsão de saldo', icon: IconPrevisao },
  { href: '/familia', label: 'Família', icon: IconFamilia },
  { href: '/cadastro', label: 'Cadastro', icon: IconCadastro },
  { href: '/ajustes', label: 'Ajustes', icon: IconAjustes },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-100 bg-white px-4 py-6 md:flex">
      <div className="mb-8 px-2">
        <span className="text-xl font-bold text-brand-600">OrçaFamília</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                ativo
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <ItemIcon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
