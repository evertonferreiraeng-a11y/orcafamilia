import { formatCurrency } from '@/lib/utils';

export type InsightSeveridade = 'alerta' | 'aviso' | 'dica' | 'elogio';

export interface Insight {
  severidade: InsightSeveridade;
  mensagem: string;
}

export interface CategoriaAcima {
  nome: string;
  percentual: number;
}

export interface DividaVencendo {
  descricao: string;
  valorParcela: number;
  diasRestantes: number;
}

export interface ParcelamentoTerminando {
  descricao: string;
  valorParcela: number;
}

export interface DadosGerente {
  saldoTotalContas: number;
  receitaMes: number;
  despesaMes: number;
  despesaFixaMes: number;
  despesaFixaMesAnterior: number;
  categoriasAcima: CategoriaAcima[];
  dividasVencendo: DividaVencendo[];
  parcelamentosTerminandoMes: ParcelamentoTerminando[];
  dividasAtivasTotal: number;
}

const LIMITE_INSIGHTS = 4;
const LIMITE_COMPROMETIMENTO_PARCELAS = 0.3;
const META_TAXA_POUPANCA = 0.2;
const MESES_RESERVA_IDEAL = 3;

function listarNomes(nomes: string[], max = 3): string {
  if (nomes.length <= max) return nomes.join(', ');
  return `${nomes.slice(0, max).join(', ')} e mais ${nomes.length - max}`;
}

export function gerarInsights(dados: DadosGerente): Insight[] {
  const insights: Insight[] = [];

  if (dados.saldoTotalContas < 0) {
    insights.push({
      severidade: 'alerta',
      mensagem: `Seu saldo total está negativo (${formatCurrency(dados.saldoTotalContas)}). Evite novos compromissos até equilibrar as contas.`,
    });
  }

  if (dados.categoriasAcima.length > 0) {
    const nomes = listarNomes(dados.categoriasAcima.map((c) => c.nome));
    insights.push({
      severidade: 'alerta',
      mensagem:
        dados.categoriasAcima.length === 1
          ? `A categoria "${nomes}" já ultrapassou o orçamento do mês.`
          : `${dados.categoriasAcima.length} categorias já ultrapassaram o orçamento este mês: ${nomes}.`,
    });
  }

  if (dados.dividasVencendo.length > 0) {
    if (dados.dividasVencendo.length === 1) {
      const d = dados.dividasVencendo[0];
      insights.push({
        severidade: 'alerta',
        mensagem: `A dívida "${d.descricao}" (${formatCurrency(d.valorParcela)}) vence em ${d.diasRestantes} dia(s).`,
      });
    } else {
      const total = dados.dividasVencendo.reduce((a, d) => a + d.valorParcela, 0);
      insights.push({
        severidade: 'alerta',
        mensagem: `Você tem ${dados.dividasVencendo.length} dívidas vencendo nos próximos dias, somando ${formatCurrency(total)}.`,
      });
    }
  }

  if (dados.despesaMes > dados.receitaMes) {
    insights.push({
      severidade: 'aviso',
      mensagem: `Suas despesas (${formatCurrency(dados.despesaMes)}) superaram as receitas (${formatCurrency(dados.receitaMes)}) este mês.`,
    });
  }

  if (dados.receitaMes > 0 && dados.despesaFixaMes / dados.receitaMes > LIMITE_COMPROMETIMENTO_PARCELAS) {
    const percentual = (dados.despesaFixaMes / dados.receitaMes) * 100;
    insights.push({
      severidade: 'aviso',
      mensagem: `Suas despesas fixas e parceladas já comprometem ${percentual.toFixed(0)}% da sua renda este mês. Evite novos compromissos por enquanto.`,
    });
  }

  if (dados.despesaFixaMesAnterior > 0 && dados.despesaFixaMes > dados.despesaFixaMesAnterior) {
    insights.push({
      severidade: 'aviso',
      mensagem: `Suas despesas fixas subiram de ${formatCurrency(dados.despesaFixaMesAnterior)} para ${formatCurrency(dados.despesaFixaMes)} em relação ao mês passado.`,
    });
  }

  if (dados.parcelamentosTerminandoMes.length > 0) {
    const nomes = listarNomes(dados.parcelamentosTerminandoMes.map((p) => p.descricao));
    const alivio = dados.parcelamentosTerminandoMes.reduce((a, p) => a + p.valorParcela, 0);
    insights.push({
      severidade: 'dica',
      mensagem: `${nomes} termina${dados.parcelamentosTerminandoMes.length === 1 ? '' : 'm'} este mês, liberando ${formatCurrency(alivio)} no seu orçamento a partir do mês que vem.`,
    });
  }

  if (dados.saldoTotalContas > 0 && dados.despesaMes > 0) {
    const mesesReserva = dados.saldoTotalContas / dados.despesaMes;
    if (mesesReserva < MESES_RESERVA_IDEAL) {
      insights.push({
        severidade: 'dica',
        mensagem: `Sua reserva cobre ${mesesReserva.toFixed(1)} mês(es) de despesas. Para construir patrimônio com segurança, tente guardar de ${MESES_RESERVA_IDEAL} a 6 meses de despesas antes de investir em outros objetivos.`,
      });
    }
  }

  if (dados.dividasAtivasTotal > 0) {
    insights.push({
      severidade: 'dica',
      mensagem: `Você tem ${formatCurrency(dados.dividasAtivasTotal)} em dívidas ativas. Quitá-las costuma valer mais a pena do que investir agora, já que os juros de dívida geralmente superam o retorno de qualquer investimento.`,
    });
  }

  if (dados.receitaMes > 0) {
    const taxaPoupanca = (dados.receitaMes - dados.despesaMes) / dados.receitaMes;
    const percentual = Math.round(taxaPoupanca * 100);
    if (taxaPoupanca >= META_TAXA_POUPANCA) {
      insights.push({
        severidade: 'elogio',
        mensagem: `Você guardou ${percentual}% da sua renda este mês — ótimo ritmo para fazer seu patrimônio crescer. Continue assim!`,
      });
    } else if (taxaPoupanca >= 0) {
      insights.push({
        severidade: 'dica',
        mensagem: `Você guardou ${percentual}% da sua renda este mês. Tente chegar a ${Math.round(META_TAXA_POUPANCA * 100)}% para acelerar a construção do seu patrimônio.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      severidade: 'elogio',
      mensagem: 'Suas finanças estão em dia este mês. Continue assim!',
    });
  }

  return insights.slice(0, LIMITE_INSIGHTS);
}
