'use client';

import type { CategoriaAnual, SubcategoriaAnual } from '@/components/orcamentos/OrcamentosClient';
import { cn, formatCurrency } from '@/lib/utils';


type Linha = CategoriaAnual | SubcategoriaAnual;

export interface ItemPlanejado {
  tipo: 'receita' | 'despesa';
  categoriaId: string;
  subcategoriaId: string | null;
  valor: number | null;
}

/* ---------- helpers de histórico ---------- */

/** Executado no mês (aceita -1..-3 = out..dez do ano anterior). */
export function executadoNoMes(l: Linha, mes: number): number {
  if (mes >= 0) return l.valoresExecutadosPorMes[mes] ?? 0;
  return l.executadoAnterior?.[mes + 3] ?? 0;
}

/** Média dos últimos 3 meses fechados, ignorando meses sem nenhum lançamento. */
export function mediaTresMeses(l: Linha, mes: number): number {
  const valores = [mes - 1, mes - 2, mes - 3].map((m) => executadoNoMes(l, m)).filter((v) => v > 0);
  if (!valores.length) return 0;
  return valores.reduce((a, v) => a + v, 0) / valores.length;
}

export function orcadoMesAnterior(l: Linha, mes: number): number | null {
  return mes > 0 ? l.valoresPorMes[mes - 1] : l.orcadoDezAnterior ?? null;
}

export function arredondar(v: number): number {
  // sugestões arredondadas para dezenas — ninguém planeja R$ 2.637,41
  return v >= 100 ? Math.round(v / 10) * 10 : Math.round(v);
}

/** Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234". Vazio = sem orçamento. */
export function parseValor(texto: string): number | null {
  let t = texto.replace(/R\$|\s/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatarEntrada(v: number | null): string {
  if (v == null || v <= 0) return '';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}


/* ---------- campo de valor ---------- */

export function CampoValor({
  valor,
  onChange,
  alterado,
  rotulo,
}: {
  valor: string;
  onChange: (v: string) => void;
  alterado: boolean;
  rotulo: string;
}) {
  return (
    <div className="relative w-32 shrink-0">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
      <input
        data-planejar
        inputMode="decimal"
        aria-label={rotulo}
        value={valor}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const campos = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-planejar]'));
          const i = campos.indexOf(e.currentTarget);
          campos[e.shiftKey ? i - 1 : i + 1]?.focus();
        }}
        className={cn(
          'w-full rounded-xl border bg-white py-2 pl-8 pr-2.5 text-right text-sm font-semibold tabular-nums text-gray-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200',
          alterado ? 'border-brand-300 bg-brand-50/40' : 'border-gray-200'
        )}
      />
    </div>
  );
}

export function ChipSugestao({ rotulo, valor, ativo, onClick }: { rotulo: string; valor: number; ativo: boolean; onClick: () => void }) {
  if (valor <= 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Usar ${formatCurrency(valor)}`}
      className={cn(
        'rounded-lg px-2 py-1 text-[11px] font-semibold transition',
        ativo ? 'bg-brand-100 text-brand-700' : 'bg-gray-50 text-gray-500 ring-1 ring-inset ring-gray-200 hover:bg-gray-100 hover:text-gray-800'
      )}
    >
      {rotulo}
    </button>
  );
}
