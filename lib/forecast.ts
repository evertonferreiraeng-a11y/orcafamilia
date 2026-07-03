import { addMeses } from '@/lib/utils';

export interface RecorrenteResumo {
  tipo: 'receita' | 'despesa';
  valor: number;
  frequencia: 'mensal' | 'semanal' | null;
}

const SEMANAS_POR_MES = 52 / 12;

export function impactoMensalRecorrentes(recorrentes: RecorrenteResumo[]): number {
  return recorrentes.reduce((acc, t) => {
    const sinal = t.tipo === 'receita' ? 1 : -1;
    if (t.frequencia === 'mensal') return acc + sinal * t.valor;
    if (t.frequencia === 'semanal') return acc + sinal * t.valor * SEMANAS_POR_MES;
    return acc;
  }, 0);
}

export interface PontoProjecao {
  mes: Date;
  saldo: number;
}

/**
 * Projeta o saldo futuro assumindo que cada transação recorrente se repete
 * com o mesmo valor todo mês (convertendo frequência semanal para uma média
 * mensal). É uma aproximação deliberada — não simula datas exatas de cada
 * ocorrência.
 */
export function projetarSaldo(
  saldoAtual: number,
  recorrentes: RecorrenteResumo[],
  meses: number,
  referencia: Date = new Date()
): PontoProjecao[] {
  const impacto = impactoMensalRecorrentes(recorrentes);
  const pontos: PontoProjecao[] = [];
  let saldo = saldoAtual;

  for (let i = 1; i <= meses; i++) {
    saldo += impacto;
    pontos.push({ mes: addMeses(referencia, i), saldo });
  }

  return pontos;
}
