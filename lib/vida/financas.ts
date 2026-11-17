// Leitura dos dados financeiros do Life para o Mentor de Vida (somente servidor).
import type { createServerSupabase } from '@/lib/supabase-server';
import type { FonteIndicador } from '@/types/database';

type Supa = ReturnType<typeof createServerSupabase>;

export interface DividaMentor {
  id: string;
  nome: string;
  credor: string | null;
  restante: number;
  total: number;
  parcelasRestantes: number | null;
  parcelaEstimada: number | null; // restante / parcelas restantes
  taxa: number | null; // % a.m. informada pelo usuário
  parcela: number | null; // parcela informada pelo usuário
  vencimento: string | null;
  situacao: string;
}

export interface FinancasMentor {
  dividas: DividaMentor[];
  dividasRestante: number;
  mes: { receita: number; despesa: number; sobra: number };
  meses: { mes: string; receita: number; despesa: number; sobra: number }[]; // últimos 3 fechados
  sobraMedia: number | null;
  cofre: number;
  disponivel: boolean;
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function carregarFinancas(supabase: Supa, userId: string): Promise<FinancasMentor> {
  const hoje = new Date();
  const inicio3 = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const [{ data: dividas }, { data: params }, { data: tx }, { data: cofres }] = await Promise.all([
    supabase
      .from('dividas')
      .select('id, descricao, credor, valor_total, valor_pago, parcelas_total, parcelas_pagas, data_vencimento, situacao, status')
      .eq('status', 'ativa'),
    supabase.from('vida_dividas_params').select('divida_id, taxa_mensal, parcela'),
    supabase
      .from('transacoes')
      .select('data, tipo, valor')
      .eq('user_id', userId)
      .eq('eh_transferencia', false)
      .gte('data', ymd(inicio3))
      .lte('data', ymd(fimMes)),
    supabase.from('cofres').select('saldo'),
  ]);

  const par = new Map<string, { taxa_mensal: number | null; parcela: number | null }>(
    (params ?? []).map((p) => [p.divida_id, { taxa_mensal: p.taxa_mensal, parcela: p.parcela }])
  );
  const lista: DividaMentor[] = (dividas ?? [])
    .map((d) => {
      const restante = Math.max(0, Number(d.valor_total) - Number(d.valor_pago));
      const parcelasRestantes = d.parcelas_total ? Math.max(0, d.parcelas_total - (d.parcelas_pagas ?? 0)) : null;
      const p = par.get(d.id);
      return {
        id: d.id,
        nome: d.descricao,
        credor: d.credor,
        restante,
        total: Number(d.valor_total),
        parcelasRestantes,
        parcelaEstimada: parcelasRestantes ? restante / parcelasRestantes : null,
        taxa: p?.taxa_mensal != null ? Number(p.taxa_mensal) : null,
        parcela: p?.parcela != null ? Number(p.parcela) : null,
        vencimento: d.data_vencimento,
        situacao: d.situacao ?? 'ativa',
      };
    })
    .filter((d) => d.restante > 0.005)
    .sort((a, b) => b.restante - a.restante);

  const porMes = new Map<string, { receita: number; despesa: number }>();
  for (const t of tx ?? []) {
    const k = t.data.slice(0, 7);
    const m = porMes.get(k) ?? { receita: 0, despesa: 0 };
    if (t.tipo === 'receita') m.receita += Number(t.valor);
    else m.despesa += Number(t.valor);
    porMes.set(k, m);
  }
  const chave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const atual = porMes.get(chave(hoje)) ?? { receita: 0, despesa: 0 };
  const meses = [3, 2, 1].map((n) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - n, 1);
    const m = porMes.get(chave(d)) ?? { receita: 0, despesa: 0 };
    return { mes: chave(d), ...m, sobra: m.receita - m.despesa };
  });
  const comDados = meses.filter((m) => m.receita > 0 || m.despesa > 0);

  return {
    dividas: lista,
    dividasRestante: lista.reduce((s, d) => s + d.restante, 0),
    mes: { ...atual, sobra: atual.receita - atual.despesa },
    meses,
    sobraMedia: comDados.length ? comDados.reduce((s, m) => s + m.sobra, 0) / comDados.length : null,
    cofre: (cofres ?? []).reduce((s, c) => s + Number(c.saldo), 0),
    disponivel: true,
  };
}

export function valorDaFonte(f: FinancasMentor, fonte: FonteIndicador): number | null {
  if (fonte === 'dividas_restante') return Math.round(f.dividasRestante * 100) / 100;
  if (fonte === 'sobra_mes') return Math.round(f.mes.sobra * 100) / 100;
  if (fonte === 'cofre_saldo') return Math.round(f.cofre * 100) / 100;
  return null;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Resumo em texto para a IA (números reais do app Orçamento). */
export function financasEmTexto(f: FinancasMentor): string {
  const linhas: string[] = ['Dados reais do app Orçamento do Life (use estes números; não invente outros):'];
  linhas.push(`- Mês atual até agora: receitas ${brl(f.mes.receita)}, despesas ${brl(f.mes.despesa)}, sobra ${brl(f.mes.sobra)}.`);
  const m = f.meses.filter((x) => x.receita > 0 || x.despesa > 0);
  if (m.length) linhas.push(`- Últimos meses: ${m.map((x) => `${x.mes} sobra ${brl(x.sobra)} (rec. ${brl(x.receita)} / desp. ${brl(x.despesa)})`).join('; ')}.`);
  else linhas.push('- Meses anteriores: sem lançamentos suficientes.');
  linhas.push(`- Guardado no Cofre (reserva): ${brl(f.cofre)}.`);
  if (f.dividas.length) {
    linhas.push(`- Dívidas ativas (total que falta pagar: ${brl(f.dividasRestante)}):`);
    for (const d of f.dividas) {
      const partes = [
        `falta ${brl(d.restante)}`,
        d.parcelasRestantes != null && `${d.parcelasRestantes} parcela(s) restante(s)`,
        d.parcela != null ? `parcela ${brl(d.parcela)}` : d.parcelaEstimada != null && `parcela estimada ${brl(d.parcelaEstimada)}`,
        d.taxa != null ? `juros ${d.taxa.toLocaleString('pt-BR')}% a.m.` : 'juros NÃO informados',
        d.credor && `credor ${d.credor}`,
        d.situacao !== 'ativa' && `situação ${d.situacao}`,
      ].filter(Boolean);
      linhas.push(`  • ${d.nome}: ${partes.join(', ')}`);
    }
    if (f.dividas.some((d) => d.taxa == null)) linhas.push('  (Quando faltar a taxa de juros, pergunte ao usuário ou peça para preencher em "Sair das dívidas".)');
  } else {
    linhas.push('- Nenhuma dívida ativa cadastrada no app Dívidas.');
  }
  return linhas.join('\n');
}
