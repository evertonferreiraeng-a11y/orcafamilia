'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase';
import { IconChevronDown, IconLogout } from '@/components/icons';

export function UserMenu({ nome, email }: { nome: string; email: string }) {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  async function sair() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const iniciais = nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-gray-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
          {iniciais || 'U'}
        </span>
        <span className="hidden text-left text-sm sm:block">
          <span className="block font-medium text-gray-800">{nome}</span>
        </span>
        <IconChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-elevated">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-gray-800">{nome}</p>
              <p className="truncate text-xs text-gray-400">{email}</p>
            </div>
            <button
              type="button"
              onClick={sair}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-negative hover:bg-red-50"
            >
              <IconLogout className="h-4 w-4" />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
