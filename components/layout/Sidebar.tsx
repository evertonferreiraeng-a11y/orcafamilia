'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
  IconWallet,
  IconClose,
} from '@/components/icons';

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
      { href: '/transacoes', label: 'Transações', icon: IconTransacoes },
      { href: '/orcamentos', label: 'Orçamentos', icon: IconOrcamentos },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { href: '/dividas', label: 'Dívidas', icon: IconDividas },
      { href: '/metas', label: 'Metas', icon: IconMetas },
      { href: '/previsao', label: 'Previsão de saldo', icon: IconPrevisao },
    ],
  },
  {
    label: 'Geral',
    items: [
      { href: '/familia', label: 'Família', icon: IconFamilia },
      { href: '/cadastro', label: 'Cadastro', icon: IconCadastro },
      { href: '/ajustes', label: 'Ajustes', icon: IconAjustes },
    ],
  },
];

const NAV_ITEMS_FLAT = NAV_GROUPS.flatMap((grupo) => grupo.items);

function Logo() {
  return (
    <div className="mb-8 flex items-center gap-2 px-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
        <IconWallet className="h-5 w-5" />
      </span>
      <span className="text-base font-bold text-gray-900">OrçaFamília</span>
    </div>
  );
}

function LogoCompacto() {
  return (
    <div className="mb-8 flex items-center justify-center">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
        <IconWallet className="h-5 w-5" />
      </span>
    </div>
  );
}

function NavGroups({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{group.label}</p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    ativo ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <ItemIcon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavIconsCompactos({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto">
      {NAV_ITEMS_FLAT.map((item) => {
        const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const ItemIcon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
              ativo ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <ItemIcon className="h-5 w-5" />
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  mobileOpen = false,
  onClose,
  desktopOpen = true,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
  desktopOpen?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-gray-100 bg-white py-6 md:flex',
          desktopOpen ? 'w-64 px-4' : 'w-[4.5rem] px-2'
        )}
      >
        {desktopOpen ? (
          <>
            <Logo />
            <NavGroups pathname={pathname} />
          </>
        ) : (
          <>
            <LogoCompacto />
            <NavIconsCompactos pathname={pathname} />
          </>
        )}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="relative z-10 flex h-full w-72 flex-col bg-white px-4 py-6 shadow-elevated">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fechar menu"
            >
              <IconClose className="h-5 w-5" />
            </button>
            <Logo />
            <NavGroups pathname={pathname} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
