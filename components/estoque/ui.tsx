'use client';

import { cn } from '@/lib/utils';
import {
  ALERTA_LABEL,
  STATUS_LABEL,
  alertaLote,
  type AlertaLote,
  type StatusProduto,
} from '@/lib/estoque/calc';
import type { EstoqueLote } from '@/types/database';

export type Tom = 'verde' | 'amarelo' | 'vermelho' | 'laranja' | 'azul' | 'cinza';

const TOM_BADGE: Record<Tom, string> = {
  verde: 'bg-emerald-50 text-emerald-700',
  amarelo: 'bg-amber-50 text-amber-700',
  vermelho: 'bg-red-50 text-red-700',
  laranja: 'bg-orange-50 text-orange-700',
  azul: 'bg-brand-50 text-brand-700',
  cinza: 'bg-gray-100 text-gray-600',
};
const TOM_BARRA: Record<Tom, string> = {
  verde: 'bg-emerald-500',
  amarelo: 'bg-amber-500',
  vermelho: 'bg-red-500',
  laranja: 'bg-orange-500',
  azul: 'bg-brand-500',
  cinza: 'bg-gray-300',
};
const TOM_KPI: Record<Tom, string> = {
  verde: 'border-l-emerald-500',
  amarelo: 'border-l-amber-500',
  vermelho: 'border-l-red-500',
  laranja: 'border-l-orange-500',
  azul: 'border-l-brand-500',
  cinza: 'border-l-gray-300',
};

export const TOM_STATUS: Record<StatusProduto, Tom> = { green: 'verde', amber: 'amarelo', red: 'vermelho', sm: 'cinza' };
export const TOM_ALERTA: Record<AlertaLote, Tom> = { venc: 'vermelho', d30: 'vermelho', d60: 'laranja', d90: 'amarelo', ok: 'verde', none: 'cinza' };

export function Badge({ tom, children, ponto = true }: { tom: Tom; children: React.ReactNode; ponto?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', TOM_BADGE[tom])}>
      {ponto && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: StatusProduto }) {
  return <Badge tom={TOM_STATUS[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function AlertaBadge({ lote }: { lote: EstoqueLote }) {
  if (lote.saldo_negativo) return <Badge tom="vermelho">Saldo negativo</Badge>;
  const a = alertaLote(lote);
  return <Badge tom={TOM_ALERTA[a]}>{ALERTA_LABEL[a]}</Badge>;
}

export function Barra({ pct, tom = 'verde', grossa }: { pct: number; tom?: Tom; grossa?: boolean }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-gray-100', grossa ? 'h-3' : 'h-2')}>
      <div className={cn('h-full rounded-full transition-all', TOM_BARRA[tom])} style={{ width: `${p}%` }} />
    </div>
  );
}

export function Kpi({ titulo, valor, sub, tom = 'cinza' }: { titulo: string; valor: React.ReactNode; sub?: React.ReactNode; tom?: Tom }) {
  return (
    <div className={cn('rounded-2xl border border-l-4 border-gray-100 bg-white p-4 shadow-card', TOM_KPI[tom])}>
      <p className="text-xs font-medium text-gray-500">{titulo}</p>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-gray-900">{valor}</p>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

export function Secao({
  titulo,
  extra,
  children,
  semPadding,
  className,
}: {
  titulo?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  semPadding?: boolean;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-2xl border border-gray-100 bg-white shadow-card', className)}>
      {(titulo || extra) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
          {titulo && <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>}
          <div className="flex-1" />
          {extra}
        </div>
      )}
      <div className={semPadding ? '' : 'p-4'}>{children}</div>
    </section>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-gray-400">{children}</div>;
}

export function Aviso({ tom = 'azul', children, acao }: { tom?: Tom; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm', TOM_BADGE[tom])}>
      <div className="min-w-0 flex-1">{children}</div>
      {acao}
    </div>
  );
}

/** Wrapper de tabela com rolagem horizontal no celular. */
export function Tabela({ children, minW = 800 }: { children: React.ReactNode; minW?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth: minW }}>
        {children}
      </table>
    </div>
  );
}
export const TH = 'whitespace-nowrap border-b border-gray-100 bg-gray-50 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500';
export const THN = `${TH} text-right`;
export const TD = 'border-b border-gray-50 px-3 py-2.5 align-middle text-gray-700';
export const TDN = `${TD} whitespace-nowrap text-right tabular-nums`;

export function Campo({
  rotulo,
  obrigatorio,
  dica,
  children,
  className,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  dica?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="label-field">
        {rotulo}
        {obrigatorio && <span className="text-negative"> *</span>}
      </span>
      {children}
      {dica && <span className="mt-1 block text-[11px] text-gray-400">{dica}</span>}
    </label>
  );
}

export function BotaoIcone({
  titulo,
  onClick,
  children,
  perigo,
}: {
  titulo: string;
  onClick: () => void;
  children: React.ReactNode;
  perigo?: boolean;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      className={cn(
        'rounded-lg p-1.5 text-gray-400 transition-colors',
        perigo ? 'hover:bg-red-50 hover:text-negative' : 'hover:bg-gray-100 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  );
}
