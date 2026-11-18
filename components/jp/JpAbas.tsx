import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Alternância entre as telas do JP (convidados / compras). */
export function JpAbas({ atual }: { atual: 'convidados' | 'compras' }) {
  const abas = [
    { id: 'convidados', href: '/jp', rotulo: 'Convidados' },
    { id: 'compras', href: '/jp/compras', rotulo: 'Lista de compras' },
  ] as const;
  return (
    <nav className="mx-auto flex w-fit rounded-full border border-[#d5e0ee] bg-white/90 p-1 text-sm font-semibold shadow-sm">
      {abas.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          className={cn('rounded-full px-4 py-1.5 transition-colors', atual === a.id ? 'bg-[#3f6aa6] text-white shadow-sm' : 'text-[#5d7aa3] hover:text-[#2f5288]')}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
