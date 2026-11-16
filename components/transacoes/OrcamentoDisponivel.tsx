'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { resumoOrcamentoLancamento, type ResumoOrcamentoLancamento } from '@/app/(dashboard)/orcamentos/actions';
import { emojiCategoria } from '@/lib/emojiCategoria';
import { cn, formatCurrency } from '@/lib/utils';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function Barra({ orcado, usado, novo, receita }: { orcado: number; usado: number; novo: number; receita: boolean }) {
  const base = Math.max(orcado, usado + novo, 1);
  const depois = usado + novo;
  const estoura = !receita && depois > orcado + 0.005;
  return (
    <div className="relative h-2.5 overflow-hidden rounded-full bg-gray-100">
      <div
        className={cn('absolute inset-y-0 left-0 rounded-l-full transition-all duration-300', receita ? 'bg-emerald-500' : usado > orcado ? 'bg-red-500' : 'bg-brand-500')}
        style={{ width: `${(usado / base) * 100}%` }}
      />
      {novo > 0 && (
        <div
          className={cn(
            'absolute inset-y-0 transition-all duration-300',
            estoura ? 'bg-red-300' : receita ? 'bg-emerald-300' : 'bg-brand-300'
          )}
          style={{
            left: `${(usado / base) * 100}%`,
            width: `${(novo / base) * 100}%`,
            backgroundImage:
              'linear-gradient(45deg, rgba(255,255,255,.45) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.45) 50%, rgba(255,255,255,.45) 75%, transparent 75%)',
            backgroundSize: '8px 8px',
          }}
          title="Este lançamento"
        />
      )}
      {orcado > 0 && depois > orcado && (
        <span className="absolute inset-y-0 w-0.5 bg-gray-800/70" style={{ left: `calc(${(orcado / base) * 100}% - 1px)` }} title="Limite do orçamento" />
      )}
    </div>
  );
}

function Bloco({
  titulo,
  orcado,
  usado,
  novo,
  receita,
  pequeno,
}: {
  titulo: React.ReactNode;
  orcado: number;
  usado: number;
  novo: number;
  receita: boolean;
  pequeno?: boolean;
}) {
  const disponivel = orcado - usado;
  const depois = orcado - usado - novo;
  return (
    <div className={cn(pequeno && 'border-t border-gray-200/70 pt-3')}>
      <p className={cn('mb-2 font-semibold text-gray-800', pequeno ? 'text-xs' : 'text-sm')}>{titulo}</p>
      <div className="mb-2 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{receita ? 'Previsto' : 'Orçado'}</p>
          <p className={cn('font-bold tabular-nums text-gray-900', pequeno ? 'text-xs' : 'text-sm')}>{formatCurrency(orcado)}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{receita ? 'Recebido' : 'Utilizado'}</p>
          <p className={cn('font-bold tabular-nums text-gray-900', pequeno ? 'text-xs' : 'text-sm')}>{formatCurrency(usado)}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{receita ? 'Falta receber' : 'Disponível'}</p>
          <p className={cn('font-bold tabular-nums', pequeno ? 'text-xs' : 'text-sm', !receita && disponivel < 0 ? 'text-negative' : 'text-positive')}>
            {formatCurrency(disponivel)}
          </p>
        </div>
      </div>
      <Barra orcado={orcado} usado={usado} novo={novo} receita={receita} />
      {novo > 0 && (
        <p className={cn('mt-1.5 text-xs', !receita && depois < 0 ? 'font-semibold text-red-600' : 'text-gray-500')}>
          {receita
            ? depois > 0
              ? `Com este lançamento, faltarão ${formatCurrency(depois)} para o previsto.`
              : 'Com este lançamento, o previsto é atingido. 🤑'
            : depois < 0
            ? disponivel < 0
              ? `🔥 Já estava estourado — vai para ${formatCurrency(-depois)} acima do orçado.`
              : `🔥 Este lançamento estoura o orçamento em ${formatCurrency(-depois)}.`
            : `Depois deste lançamento: ${formatCurrency(depois)} disponíveis${orcado > 0 ? ` (${Math.round(((usado + novo) / orcado) * 100)}% usado)` : ''}.`}
        </p>
      )}
    </div>
  );
}

/** Painel "orçamento desta categoria" mostrado no formulário de transação. */
export function OrcamentoDisponivel({
  categoriaId,
  categoriaNome,
  categoriaIcone,
  subcategoriaId,
  subcategoriaNome,
  mesRef,
  valor,
  receita,
  excluirTransacaoId,
}: {
  categoriaId: string;
  categoriaNome: string;
  categoriaIcone?: string | null;
  subcategoriaId: string | null;
  subcategoriaNome?: string | null;
  mesRef: string; // yyyy-MM
  valor: number;
  receita: boolean;
  excluirTransacaoId?: string;
}) {
  const [resumo, setResumo] = useState<ResumoOrcamentoLancamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    const t = setTimeout(() => {
      resumoOrcamentoLancamento(categoriaId, subcategoriaId, mesRef, excluirTransacaoId).then((r) => {
        if (!ativo) return;
        setCarregando(false);
        if (r.error) setErro(r.error);
        else setResumo(r.resumo ?? null);
      });
    }, 150);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [categoriaId, subcategoriaId, mesRef, excluirTransacaoId]);

  const [ano, mes] = mesRef.split('-').map(Number);
  const nomeMes = MESES[(mes || 1) - 1];
  const novo = Number.isFinite(valor) && valor > 0 ? valor : 0;
  const hrefDefinir = `/orcamentos?ano=${ano}&mes=${mes}&categoria=${categoriaId}`;
  const emoji = emojiCategoria(categoriaNome, categoriaIcone);

  if (erro) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
      {carregando && !resumo ? (
        <div className="space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-8 animate-pulse rounded bg-gray-200" />
        </div>
      ) : resumo && resumo.categoria.orcado <= 0 && (!resumo.subcategoria || resumo.subcategoria.orcado <= 0) ? (
        <div className="flex items-center gap-3">
          <span className="text-xl">{emoji}</span>
          <p className="flex-1 text-xs text-gray-600">
            <b>{categoriaNome}</b> não tem {receita ? 'valor previsto' : 'orçamento'} em {nomeMes}
            {resumo.categoria.usado > 0 && <> · já {receita ? 'recebido' : 'utilizado'} {formatCurrency(resumo.categoria.usado)}</>}.
          </p>
          <Link href={hrefDefinir} target="_blank" className="shrink-0 text-xs font-semibold text-brand-600 hover:underline">
            Definir →
          </Link>
        </div>
      ) : resumo ? (
        <div className={cn('space-y-3 transition-opacity', carregando && 'opacity-60')}>
          <Bloco
            titulo={
              <>
                <span className="mr-1.5">{emoji}</span>
                {receita ? 'Previsto' : 'Orçamento'} de {categoriaNome} em {nomeMes}
              </>
            }
            orcado={resumo.categoria.orcado}
            usado={resumo.categoria.usado}
            novo={novo}
            receita={receita}
          />
          {resumo.subcategoria && resumo.subcategoria.orcado > 0 && (
            <Bloco
              titulo={<>↳ {subcategoriaNome ?? 'Subcategoria'}</>}
              orcado={resumo.subcategoria.orcado}
              usado={resumo.subcategoria.usado}
              novo={novo}
              receita={receita}
              pequeno
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
