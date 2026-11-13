import { formatCurrency } from '@/lib/utils';

/**
 * Saúde financeira do mês: 5 sinais vitais, cada um vale até 20 pontos (nota 0–100).
 * Regras simples e explicáveis — o tooltip da nota mostra a conta.
 */

export type CorSinal = 'verde' | 'amarelo' | 'vermelho';

export interface Sinal {
  chave: 'sobra' | 'orcamento' | 'dividas' | 'reserva' | 'contas';
  emoji: string;
  rotulo: string;
  valor: string;
  detalhe: string;
  pontos: number;
  cor: CorSinal;
  href: string;
}

export interface SaudeFinanceira {
  nota: number;
  emoji: string;
  titulo: string;
  diagnostico: string;
  sinais: Sinal[];
}

export interface EntradaSaude {
  receita: number;
  despesa: number;
  dividasMes: number;
  categoriasComOrcamento: number;
  categoriasEstouradas: { nome: string; pct: number }[];
  categoriasPerto: number;
  reserva: number;
  mediaDespesaMensal: number;
  contasNegativas: { nome: string; saldo: number }[];
  contasAtrasadas: number;
  hrefOrcamentos: string;
}

export const META_SOBRA = 0.2;
export const LIMITE_DIVIDAS = 0.3;
export const META_RESERVA_MESES = 6;

const clamp = (v: number, min = 0, max = 20) => Math.max(min, Math.min(max, v));

function sinalSobra(e: EntradaSaude): Sinal {
  const base = { chave: 'sobra' as const, emoji: '🐷', rotulo: 'Sobra do mês', href: '/transacoes' };
  if (e.receita <= 0) {
    return { ...base, valor: '—', detalhe: 'sem receita no mês', pontos: 0, cor: 'vermelho' };
  }
  const taxa = (e.receita - e.despesa) / e.receita;
  const pontos = taxa >= META_SOBRA ? 20 : taxa <= 0 ? 0 : (taxa / META_SOBRA) * 20;
  return {
    ...base,
    valor: `${Math.round(taxa * 100)}%`,
    detalhe: taxa < 0 ? `faltou ${formatCurrency(e.despesa - e.receita)}` : `meta: ${Math.round(META_SOBRA * 100)}% ou mais`,
    pontos,
    cor: taxa >= META_SOBRA ? 'verde' : taxa >= 0 ? 'amarelo' : 'vermelho',
  };
}

function sinalOrcamento(e: EntradaSaude): Sinal {
  const base = { chave: 'orcamento' as const, emoji: '🎯', rotulo: 'Orçamento', href: e.hrefOrcamentos };
  if (e.categoriasComOrcamento === 0) {
    return { ...base, valor: 'sem orçamento', detalhe: 'defina em Orçamentos', pontos: 10, cor: 'amarelo' };
  }
  const n = e.categoriasEstouradas.length;
  const pontos = clamp(20 * (1 - n / e.categoriasComOrcamento));
  const pior = [...e.categoriasEstouradas].sort((a, b) => b.pct - a.pct)[0];
  return {
    ...base,
    valor: n === 0 ? 'tudo dentro' : `${n} estourou${n > 1 ? 'ram' : ''}`,
    detalhe: pior
      ? `${pior.nome} ${Math.round(pior.pct)}%${n > 1 ? ` e +${n - 1}` : ''}`
      : e.categoriasPerto > 0
      ? `${e.categoriasPerto} perto do limite`
      : `${e.categoriasComOrcamento} categorias orçadas`,
    pontos,
    cor: n === 0 ? 'verde' : n <= Math.max(1, Math.floor(e.categoriasComOrcamento / 4)) ? 'amarelo' : 'vermelho',
  };
}

function sinalDividas(e: EntradaSaude): Sinal {
  const base = { chave: 'dividas' as const, emoji: '🧾', rotulo: 'Dívidas', href: '/dividas' };
  if (e.receita <= 0) {
    return { ...base, valor: e.dividasMes > 0 ? formatCurrency(e.dividasMes) : '—', detalhe: 'sem receita para comparar', pontos: e.dividasMes > 0 ? 0 : 20, cor: e.dividasMes > 0 ? 'vermelho' : 'verde' };
  }
  const pct = e.dividasMes / e.receita;
  // até 15% = 20 pts · 15–30% cai para 10 · 30–50% cai para 0
  const pontos = pct <= 0.15 ? 20 : pct <= LIMITE_DIVIDAS ? 20 - ((pct - 0.15) / 0.15) * 10 : pct <= 0.5 ? 10 - ((pct - LIMITE_DIVIDAS) / 0.2) * 10 : 0;
  return {
    ...base,
    valor: `${Math.round(pct * 100)}%`,
    detalhe: `da renda · limite ${Math.round(LIMITE_DIVIDAS * 100)}%`,
    pontos: clamp(pontos),
    cor: pct < 0.2 ? 'verde' : pct <= LIMITE_DIVIDAS ? 'amarelo' : 'vermelho',
  };
}

function sinalReserva(e: EntradaSaude): Sinal {
  const base = { chave: 'reserva' as const, emoji: '🛟', rotulo: 'Reserva', href: '/cofre' };
  if (e.mediaDespesaMensal <= 0) {
    return { ...base, valor: formatCurrency(e.reserva), detalhe: 'no Cofre', pontos: e.reserva > 0 ? 20 : 0, cor: e.reserva > 0 ? 'verde' : 'vermelho' };
  }
  const meses = e.reserva / e.mediaDespesaMensal;
  const fmt = meses >= 10 || meses === 0 ? meses.toFixed(0) : meses.toFixed(1).replace('.', ',');
  return {
    ...base,
    valor: `${fmt} ${meses >= 0.95 && meses < 1.05 ? 'mês' : 'meses'}`,
    detalhe: e.reserva > 0 ? `${formatCurrency(e.reserva)} no Cofre · meta ${META_RESERVA_MESES}` : `meta: ${META_RESERVA_MESES} meses`,
    pontos: clamp((meses / META_RESERVA_MESES) * 20),
    cor: meses >= META_RESERVA_MESES ? 'verde' : meses >= 3 ? 'amarelo' : 'vermelho',
  };
}

function sinalContas(e: EntradaSaude): Sinal {
  const base = { chave: 'contas' as const, emoji: '✅', rotulo: 'Contas em dia', href: '/transacoes?status=pendente' };
  const problemas = e.contasNegativas.length + (e.contasAtrasadas > 0 ? 1 : 0);
  const partes: string[] = [];
  if (e.contasNegativas.length) partes.push(`${e.contasNegativas.length} negativa${e.contasNegativas.length > 1 ? 's' : ''}`);
  if (e.contasAtrasadas) partes.push(`${e.contasAtrasadas} atrasada${e.contasAtrasadas > 1 ? 's' : ''}`);
  const negativa = e.contasNegativas[0];
  return {
    ...base,
    valor: problemas === 0 ? 'tudo certo' : partes.join(' · '),
    detalhe:
      problemas === 0
        ? 'nada atrasado ou negativo'
        : negativa
        ? `${negativa.nome} ${formatCurrency(negativa.saldo)}`
        : 'pague as atrasadas',
    pontos: clamp(20 - problemas * 10),
    cor: problemas === 0 ? 'verde' : problemas === 1 ? 'amarelo' : 'vermelho',
  };
}

export function calcularSaude(e: EntradaSaude): SaudeFinanceira {
  const sinais = [sinalSobra(e), sinalOrcamento(e), sinalDividas(e), sinalReserva(e), sinalContas(e)];
  const nota = Math.round(sinais.reduce((a, s) => a + s.pontos, 0));

  const { emoji, titulo } =
    nota >= 80
      ? { emoji: '😌', titulo: 'Finanças saudáveis' }
      : nota >= 60
      ? { emoji: '🙂', titulo: 'No caminho certo' }
      : nota >= 40
      ? { emoji: '😬', titulo: 'Atenção' }
      : { emoji: '🚨', titulo: 'Precisa de cuidado' };

  const frases: string[] = [];
  if (e.receita > 0) {
    const gasto = Math.round((e.despesa / e.receita) * 100);
    const sobra = e.receita - e.despesa;
    frases.push(
      sobra >= 0
        ? `Você gastou ${gasto}% do que entrou e sobram ${formatCurrency(sobra)}.`
        : `Os gastos passaram a receita em ${formatCurrency(-sobra)}.`
    );
  } else {
    frases.push('Ainda não há receita lançada neste mês.');
  }
  const fracos = sinais.filter((s) => s.cor === 'vermelho').map((s) => DESCRICAO_PROBLEMA[s.chave]);
  const medios = sinais.filter((s) => s.cor === 'amarelo').map((s) => DESCRICAO_PROBLEMA[s.chave]);
  if (fracos.length) frases.push(`O que mais pesa: ${juntar(fracos)}.`);
  if (medios.length) frases.push(`${fracos.length ? 'De olho também em' : 'Para melhorar'}: ${juntar(medios)}.`);
  if (!fracos.length && !medios.length) frases.push('Todos os sinais estão no verde. 👏');

  return { nota, emoji, titulo, diagnostico: frases.join(' '), sinais };
}

const DESCRICAO_PROBLEMA: Record<Sinal['chave'], string> = {
  sobra: 'sobra baixa no mês',
  orcamento: 'categorias acima do orçado',
  dividas: 'parcelas pesando na renda',
  reserva: 'reserva de emergência curta',
  contas: 'conta no negativo ou atrasada',
};

function juntar(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? '';
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/** Explica a nota (tooltip). */
export function explicarNota(s: SaudeFinanceira): string {
  return s.sinais.map((x) => `${x.emoji} ${x.rotulo}: ${Math.round(x.pontos)}/20`).join('\n') + `\n= ${s.nota}/100`;
}
