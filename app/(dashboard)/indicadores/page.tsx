import { createServerSupabase } from '@/lib/supabase-server';
import { IndicadoresClient, type PontoPatrimonio } from '@/components/indicadores/IndicadoresClient';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default async function IndicadoresPage({
  searchParams,
}: {
  searchParams: { ano?: string };
}) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const anoAtual = new Date().getFullYear();
  const ano = searchParams.ano ? Number(searchParams.ano) : anoAtual;

  const [{ data: contasTodas }, { data: transacoesContasTodas }, { data: dividasTodas }, { data: pagamentosDividasTodos }] =
    await Promise.all([
      supabase.from('contas').select('id, saldo_inicial, criado_em').eq('user_id', user.id),
      supabase
        .from('transacoes')
        .select('conta_id, tipo, valor, data')
        .eq('user_id', user.id)
        .eq('pago', true)
        .not('conta_id', 'is', null),
      supabase.from('dividas').select('id, valor_total, criado_em').eq('user_id', user.id),
      supabase.from('pagamentos_dividas').select('divida_id, valor, data_pagamento').eq('user_id', user.id),
    ]);

  const fimDosMeses = MESES_ABREV.map((_, i) => {
    const mesNum = i + 1;
    const ultimoDia = new Date(ano, mesNum, 0).getDate();
    return `${ano}-${String(mesNum).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  });

  const transacoesContasOrdenadas = [...(transacoesContasTodas ?? [])].sort((a, b) => a.data.localeCompare(b.data));
  const saldoContasPorMes: number[] = [];
  {
    let idx = 0;
    let saldoAcumuladoTransacoes = 0;
    for (const fimMes of fimDosMeses) {
      while (idx < transacoesContasOrdenadas.length && transacoesContasOrdenadas[idx].data <= fimMes) {
        const t = transacoesContasOrdenadas[idx];
        saldoAcumuladoTransacoes += (t.tipo === 'receita' ? 1 : -1) * Number(t.valor);
        idx++;
      }
      const saldoInicialTotal = (contasTodas ?? [])
        .filter((c) => c.criado_em.slice(0, 10) <= fimMes)
        .reduce((a, c) => a + Number(c.saldo_inicial), 0);
      saldoContasPorMes.push(saldoInicialTotal + saldoAcumuladoTransacoes);
    }
  }

  const pagamentosOrdenados = [...(pagamentosDividasTodos ?? [])].sort((a, b) =>
    a.data_pagamento.localeCompare(b.data_pagamento)
  );
  const dividasRestantesPorMes: number[] = [];
  {
    const pagoPorDivida = new Map<string, number>();
    let idx = 0;
    for (const fimMes of fimDosMeses) {
      while (idx < pagamentosOrdenados.length && pagamentosOrdenados[idx].data_pagamento <= fimMes) {
        const p = pagamentosOrdenados[idx];
        pagoPorDivida.set(p.divida_id, (pagoPorDivida.get(p.divida_id) ?? 0) + Number(p.valor));
        idx++;
      }
      const restante = (dividasTodas ?? [])
        .filter((d) => d.criado_em.slice(0, 10) <= fimMes)
        .reduce((a, d) => a + Math.max(0, Number(d.valor_total) - (pagoPorDivida.get(d.id) ?? 0)), 0);
      dividasRestantesPorMes.push(restante);
    }
  }

  const pontosPatrimonioAno: PontoPatrimonio[] = MESES_ABREV.map((label, i) => ({
    label,
    contas: saldoContasPorMes[i],
    dividas: dividasRestantesPorMes[i],
    liquido: saldoContasPorMes[i] - dividasRestantesPorMes[i],
  }));

  return <IndicadoresClient ano={ano} pontosPatrimonioAno={pontosPatrimonioAno} />;
}
