'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';
import {
  IconDashboard,
  IconTransacoes,
  IconOrcamentos,
  IconDividas,
  IconMetas,
  IconCofre,
  IconFamilia,
  IconCadastro,
  IconAjustes,
  IconWallet,
  IconClose,
  IconChart,
  IconApps,
  IconEstoque,
  IconValidade,
  IconTransacoes as IconMovimentacoes,
  IconAgua,
  IconBebe,
  IconCarrinho,
  IconLocal,
  IconRelatorio,
  IconLife,
  IconCasa,
  IconFerramenta,
  IconEquipamento,
  IconHistorico,
  IconContato,
} from '@/components/icons';

type NavItem = { href: string; label: string; icon: (p: SVGProps<SVGSVGElement>) => React.ReactElement; exato?: boolean };
type NavGroup = { label: string; items: NavItem[] };
export type AppId = 'orcamento' | 'estoque' | 'casa';

/** Apps disponíveis no portal. Para adicionar um novo app, inclua-o aqui e no portal (/inicio). */
export const APPS: Record<AppId, { nome: string; curto: string; href: string; icon: NavItem['icon']; grupos: NavGroup[] }> = {
  orcamento: {
    nome: 'Orçamento Familiar',
    curto: 'Orçamento',
    href: '/dashboard',
    icon: IconWallet,
    grupos: [
      {
        label: 'Principal',
        items: [
          { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
          { href: '/transacoes', label: 'Transações', icon: IconTransacoes },
          { href: '/orcamentos', label: 'Orçamentos', icon: IconOrcamentos },
          { href: '/indicadores', label: 'Patrimônio Líquido', icon: IconChart },
        ],
      },
      {
        label: 'Planejamento',
        items: [
          { href: '/dividas', label: 'Dívidas', icon: IconDividas },
          { href: '/metas', label: 'Metas', icon: IconMetas },
          { href: '/cofre', label: 'Cofre', icon: IconCofre },
        ],
      },
    ],
  },
  estoque: {
    nome: 'Estoque Familiar',
    curto: 'Estoque',
    href: '/estoque',
    icon: IconEstoque,
    grupos: [
      {
        label: 'Estoque',
        items: [
          { href: '/estoque', label: 'Painel', icon: IconDashboard, exato: true },
          { href: '/estoque/produtos', label: 'Controle de estoque', icon: IconEstoque },
          { href: '/estoque/lotes', label: 'Validade e lotes', icon: IconValidade },
          { href: '/estoque/movimentacoes', label: 'Movimentações', icon: IconMovimentacoes },
          { href: '/estoque/agua', label: 'Água potável', icon: IconAgua },
          { href: '/estoque/bebe', label: 'Alimentação do bebê', icon: IconBebe },
        ],
      },
      {
        label: 'Planejamento',
        items: [
          { href: '/estoque/compras', label: 'Lista de compras', icon: IconCarrinho },
          { href: '/estoque/financeiro', label: 'Financeiro', icon: IconWallet },
        ],
      },
      {
        label: 'Organização',
        items: [
          { href: '/estoque/locais', label: 'Locais', icon: IconLocal },
          { href: '/estoque/relatorios', label: 'Relatórios', icon: IconRelatorio },
          { href: '/estoque/configuracoes', label: 'Configurações', icon: IconAjustes },
        ],
      },
    ],
  },
  casa: {
    nome: 'Casa',
    curto: 'Casa',
    href: '/casa',
    icon: IconCasa,
    grupos: [
      {
        label: 'Casa',
        items: [
          { href: '/casa', label: 'Painel', icon: IconDashboard, exato: true },
          { href: '/casa/manutencoes', label: 'Manutenções', icon: IconFerramenta },
          { href: '/casa/itens', label: 'Itens e equipamentos', icon: IconEquipamento },
          { href: '/casa/historico', label: 'Histórico', icon: IconHistorico },
          { href: '/casa/prestadores', label: 'Prestadores', icon: IconContato },
        ],
      },
    ],
  },
};

/** Itens comuns a todos os apps (família, cadastro e ajustes da conta). */
const GRUPO_GERAL: NavGroup = {
  label: 'Geral',
  items: [
    { href: '/familia', label: 'Família', icon: IconFamilia },
    { href: '/cadastro', label: 'Cadastro', icon: IconCadastro },
    { href: '/ajustes', label: 'Ajustes', icon: IconAjustes },
  ],
};

export function appDaRota(pathname: string): AppId | null {
  if (pathname === '/inicio' || pathname.startsWith('/inicio/')) return null;
  if (pathname === '/estoque' || pathname.startsWith('/estoque/')) return 'estoque';
  if (pathname === '/casa' || pathname.startsWith('/casa/')) return 'casa';
  return 'orcamento';
}

function gruposDaRota(pathname: string): NavGroup[] {
  const app = appDaRota(pathname);
  if (app === 'estoque') return APPS.estoque.grupos;
  if (app === 'casa') return APPS.casa.grupos;
  if (app === 'orcamento') return [...APPS.orcamento.grupos, GRUPO_GERAL];
  return [GRUPO_GERAL];
}

const estaAtivo = (pathname: string, item: NavItem) => pathname === item.href || (!item.exato && pathname.startsWith(`${item.href}/`));

function Logo() {
  return (
    <Link href="/inicio" className="mb-5 flex items-center gap-2 px-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-soft">
        <IconLife className="h-5 w-5" />
      </span>
      <span className="text-base font-bold text-gray-900">Life</span>
    </Link>
  );
}

function LogoCompacto() {
  return (
    <Link href="/inicio" className="mb-5 flex items-center justify-center" title="Início – todos os apps">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-soft">
        <IconLife className="h-5 w-5" />
      </span>
    </Link>
  );
}

/** Link para o portal + seletor entre os apps. */
function SeletorApps({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const atual = appDaRota(pathname);
  return (
    <div className="space-y-1">
      <Link
        href="/inicio"
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          atual === null ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        <IconApps className="h-5 w-5" />
        Início – todos os apps
      </Link>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
        {(Object.keys(APPS) as AppId[]).map((id) => {
          const A = APPS[id];
          const ativo = atual === id;
          return (
            <Link
              key={id}
              href={A.href}
              onClick={onNavigate}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors',
                ativo ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <A.icon className="h-4 w-4" />
              {A.curto}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NavGroups({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
      <SeletorApps pathname={pathname} onNavigate={onNavigate} />
      {gruposDaRota(pathname).map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{group.label}</p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const ativo = estaAtivo(pathname, item);
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
  const itens: NavItem[] = [
    { href: '/inicio', label: 'Início – todos os apps', icon: IconApps, exato: true },
    ...gruposDaRota(pathname).flatMap((g) => g.items),
  ];
  return (
    <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto">
      {itens.map((item) => {
        const ativo = estaAtivo(pathname, item);
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
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
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
