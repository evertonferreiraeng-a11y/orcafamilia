/**
 * Simulador de quitação de dívidas (mês a mês).
 * - Todo mês: aplica os juros, paga a parcela mínima de cada dívida e joga o que
 *   sobrar do orçamento mensal na dívida prioritária.
 * - Quando uma dívida acaba, a parcela dela "rola" para a próxima (o orçamento é fixo).
 * Estratégias: avalanche (maior juros primeiro — paga menos juros) e
 * bola de neve (menor saldo primeiro — vitórias rápidas).
 */

export type Estrategia = 'avalanche' | 'bola_de_neve';

export interface DividaSim {
  id: string;
  nome: string;
  saldo: number;
  taxa: number; // % ao mês
  parcela: number; // mínimo por mês
}

export interface ResultadoSim {
  meses: number | null; // null = não quita em 50 anos
  jurosTotal: number;
  totalPago: number;
  quitacoes: { id: string; nome: string; mes: number; pagoTotal: number }[];
  serie: number[]; // saldo total no fim de cada mês (índice 0 = hoje)
  ordem: string[]; // ids na ordem de prioridade
  aviso: string | null;
  orcamentoUsado: number;
}

const MAX_MESES = 600;

export function ordenar(dividas: DividaSim[], estrategia: Estrategia): DividaSim[] {
  return [...dividas].sort((a, b) =>
    estrategia === 'avalanche'
      ? b.taxa - a.taxa || a.saldo - b.saldo
      : a.saldo - b.saldo || b.taxa - a.taxa
  );
}

export function simular(dividasEntrada: DividaSim[], orcamentoMensal: number, estrategia: Estrategia): ResultadoSim {
  const dividas = ordenar(
    dividasEntrada.filter((d) => d.saldo > 0.005).map((d) => ({ ...d, taxa: Math.max(0, d.taxa || 0), parcela: Math.max(0, d.parcela || 0) })),
    estrategia
  );
  const minimos = dividas.reduce((s, d) => s + Math.min(d.parcela, d.saldo), 0);
  let aviso: string | null = null;
  let orcamento = orcamentoMensal;
  if (orcamento < minimos) {
    aviso = `O valor mensal informado é menor que a soma das parcelas mínimas (${minimos.toFixed(2)}). A simulação usa as parcelas mínimas.`;
    orcamento = minimos;
  }

  const saldo = new Map(dividas.map((d) => [d.id, d.saldo]));
  const pago = new Map(dividas.map((d) => [d.id, 0]));
  const quitacoes: ResultadoSim['quitacoes'] = [];
  const serie = [dividas.reduce((s, d) => s + d.saldo, 0)];
  let juros = 0;
  let mes = 0;

  while (mes < MAX_MESES && Array.from(saldo.values()).some((v) => v > 0.005)) {
    mes++;
    // 1) juros do mês
    for (const d of dividas) {
      const s = saldo.get(d.id)!;
      if (s <= 0.005) continue;
      const j = s * (d.taxa / 100);
      juros += j;
      saldo.set(d.id, s + j);
    }
    // 2) parcelas mínimas
    let disponivel = orcamento;
    for (const d of dividas) {
      const s = saldo.get(d.id)!;
      if (s <= 0.005) continue;
      const p = Math.min(d.parcela, s, disponivel);
      saldo.set(d.id, s - p);
      pago.set(d.id, pago.get(d.id)! + p);
      disponivel -= p;
    }
    // 3) sobra vai para a prioridade (em ordem)
    for (const d of dividas) {
      if (disponivel <= 0.005) break;
      const s = saldo.get(d.id)!;
      if (s <= 0.005) continue;
      const p = Math.min(s, disponivel);
      saldo.set(d.id, s - p);
      pago.set(d.id, pago.get(d.id)! + p);
      disponivel -= p;
    }
    for (const d of dividas) {
      if (saldo.get(d.id)! <= 0.005 && !quitacoes.some((q) => q.id === d.id)) {
        saldo.set(d.id, 0);
        quitacoes.push({ id: d.id, nome: d.nome, mes, pagoTotal: pago.get(d.id)! });
      }
    }
    const total = Array.from(saldo.values()).reduce((a, b) => a + b, 0);
    serie.push(total);
    // dívida crescendo sem parar → não quita
    if (mes > 24 && total >= serie[mes - 12] - 0.01) {
      aviso = 'Com esse valor mensal os juros crescem mais rápido do que os pagamentos: a dívida não diminui. É preciso aumentar o valor mensal ou renegociar as taxas.';
      return { meses: null, jurosTotal: juros, totalPago: sum(pago), quitacoes, serie, ordem: dividas.map((d) => d.id), aviso, orcamentoUsado: orcamento };
    }
  }

  const quitou = Array.from(saldo.values()).every((v) => v <= 0.005);
  return {
    meses: quitou ? mes : null,
    jurosTotal: juros,
    totalPago: sum(pago),
    quitacoes,
    serie,
    ordem: dividas.map((d) => d.id),
    aviso: quitou ? aviso : aviso ?? 'Não quita em 50 anos com esse valor mensal.',
    orcamentoUsado: orcamento,
  };
}

function sum(m: Map<string, number>) {
  return Array.from(m.values()).reduce((a, b) => a + b, 0);
}

/** Data (yyyy-MM-01) daqui a N meses. */
export function mesFuturo(n: number, base = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth() + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function rotuloMes(n: number, base = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth() + n, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
}
