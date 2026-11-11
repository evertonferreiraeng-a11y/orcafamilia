import Link from 'next/link';
import { Anel } from '@/components/estoque/ui';
import { cn } from '@/lib/utils';

export type CartaoAbertura = {
  rotulo: string;
  valor: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  alerta?: boolean;
};

const GRADIENTES = {
  brand: 'from-brand-700 via-brand-600 to-brand-500',
  verde: 'from-emerald-700 via-emerald-600 to-teal-500',
  roxo: 'from-violet-700 via-indigo-600 to-sky-500',
  rosa: 'from-rose-600 via-pink-500 to-orange-400',
  ambar: 'from-amber-600 via-orange-500 to-amber-400',
} as const;

/** Faixa de abertura das telas (anel de progresso, números principais e ações). */
export function Abertura({
  sobretitulo,
  titulo,
  subtitulo,
  anel,
  cartoes,
  acoes,
  cor = 'brand',
  rodape,
}: {
  sobretitulo: string;
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  anel?: { pct: number; rotulo: string; texto?: string; alerta?: boolean };
  cartoes?: CartaoAbertura[];
  acoes?: React.ReactNode;
  cor?: keyof typeof GRADIENTES;
  rodape?: React.ReactNode;
}) {
  return (
    <section className={cn('relative overflow-hidden rounded-3xl bg-gradient-to-br px-6 py-6 text-white shadow-elevated sm:px-8', GRADIENTES[cor])}>
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 right-40 h-60 w-60 rounded-full bg-white/[0.06]" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-5">
          {anel && (
            <Anel pct={Math.min(100, Math.max(0, anel.pct))} cor={anel.alerta ? '#fecaca' : '#fff'}>
              <span className="text-2xl font-bold tabular-nums">{anel.texto ?? `${Math.round(anel.pct)}%`}</span>
              <span className="px-2 text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-white/75">{anel.rotulo}</span>
            </Anel>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{sobretitulo}</p>
            <h1 className="text-2xl font-bold tracking-tight first-letter:uppercase sm:text-3xl">{titulo}</h1>
            {subtitulo && <p className="mt-1 text-sm text-white/80">{subtitulo}</p>}
          </div>
        </div>
        {cartoes && cartoes.length > 0 && (
          <div className={cn('grid flex-1 grid-cols-2 gap-2 xl:ml-auto xl:max-w-3xl', cartoes.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
            {cartoes.map((c) => {
              const cls = cn('min-w-0 rounded-2xl px-4 py-3 text-left ring-1 ring-inset ring-white/15', c.alerta ? 'bg-red-500/25' : 'bg-white/10');
              const corpo = (
                <>
                  <p className="truncate text-[11px] font-medium text-white/75">{c.rotulo}</p>
                  <p className="truncate text-lg font-bold tabular-nums">{c.valor}</p>
                  {c.sub && <p className="truncate text-[11px] text-white/75">{c.sub}</p>}
                </>
              );
              if (c.href)
                return (
                  <Link key={c.rotulo} href={c.href} className={cn(cls, 'transition hover:bg-white/20')}>
                    {corpo}
                  </Link>
                );
              if (c.onClick)
                return (
                  <button key={c.rotulo} type="button" onClick={c.onClick} className={cn(cls, 'transition hover:bg-white/20')}>
                    {corpo}
                  </button>
                );
              return (
                <div key={c.rotulo} className={cls}>
                  {corpo}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {(acoes || rodape) && (
        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          {acoes}
          {rodape && <span className="ml-auto text-xs text-white/70">{rodape}</span>}
        </div>
      )}
    </section>
  );
}

/** Botões no padrão da abertura. */
export const botaoAbertura = {
  principal: 'inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-soft transition hover:bg-brand-50',
  claro: 'inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25',
};

/** Filtro em pílulas com contagem. */
export function Pilulas<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { id: T; rotulo: string; n?: number; ponto?: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {opcoes.map((o) => {
        const ativo = valor === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={ativo}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
              ativo ? 'bg-gray-900 text-white shadow-soft' : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
            )}
          >
            {o.ponto && <span className={cn('h-2 w-2 rounded-full', o.ponto)} />}
            {o.rotulo}
            {o.n !== undefined && <span className={cn('rounded-full px-1.5 tabular-nums', ativo ? 'bg-white/20' : 'bg-gray-100')}>{o.n}</span>}
          </button>
        );
      })}
    </div>
  );
}
