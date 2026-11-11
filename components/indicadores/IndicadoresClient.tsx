'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PatrimonioLiquidoReport } from '@/components/indicadores/PatrimonioLiquidoReport';
import { Abertura } from '@/components/ui/Abertura';
import { formatCurrency } from '@/lib/utils';

export interface PontoPatrimonio {
  label: string;
  contas: number;
  dividas: number;
  liquido: number;
}

export function IndicadoresClient({
  ano,
  pontosPatrimonioAno,
}: {
  ano: number;
  pontosPatrimonioAno: PontoPatrimonio[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function mudarAno(novoAno: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('ano', String(novoAno));
    router.push(`${pathname}?${params.toString()}`);
  }

  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = Array.from({ length: 9 }, (_, i) => anoAtual - 5 + i);
  if (!anosDisponiveis.includes(ano)) anosDisponiveis.unshift(ano);

  const idxAtual = ano === anoAtual ? new Date().getMonth() : pontosPatrimonioAno.length - 1;
  const atual = pontosPatrimonioAno[idxAtual];
  const inicio = pontosPatrimonioAno[0];
  const variacao = atual && inicio ? atual.liquido - inicio.liquido : 0;
  const pctLivre = atual && atual.contas > 0 ? Math.max(0, (atual.liquido / atual.contas) * 100) : 0;

  return (
    <div className="space-y-5">
      <Abertura
        cor="verde"
        sobretitulo={`Patrimônio líquido · ${ano}`}
        titulo={formatCurrency(atual?.liquido ?? 0)}
        subtitulo={`em ${atual?.label.toLowerCase() ?? ''} · saldo das contas menos dívidas em aberto`}
        anel={{ pct: pctLivre, rotulo: 'livre de dívidas', alerta: (atual?.liquido ?? 0) < 0 }}
        cartoes={[
          { rotulo: '🏦 Contas', valor: formatCurrency(atual?.contas ?? 0), sub: 'saldo no mês' },
          { rotulo: '💳 Dívidas', valor: formatCurrency(atual?.dividas ?? 0), sub: 'em aberto', alerta: (atual?.dividas ?? 0) > (atual?.contas ?? 0) },
          { rotulo: '🗓️ Início do ano', valor: formatCurrency(inicio?.liquido ?? 0), sub: 'patrimônio em janeiro' },
          { rotulo: variacao >= 0 ? '📈 Variação no ano' : '📉 Variação no ano', valor: `${variacao >= 0 ? '+' : ''}${formatCurrency(variacao)}`, sub: 'desde janeiro', alerta: variacao < 0 },
        ]}
        acoes={
          <select value={ano} onChange={(e) => mudarAno(Number(e.target.value))} className="rounded-xl border-0 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-soft">
            {anosDisponiveis
              .sort((a, b) => b - a)
              .map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
          </select>
        }
        rodape="Investimentos não entram nesta conta"
      />

      <PatrimonioLiquidoReport pontosPatrimonioAno={pontosPatrimonioAno} />
    </div>
  );
}
