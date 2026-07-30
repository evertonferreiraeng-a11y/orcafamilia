export interface ParcelamentoAtivo {
  descricao: string;
  valorParcela: number;
  parcelaAtual: number;
  parcelaTotal: number;
  dataFim: string | null;
}

interface LinhaParcelamento {
  descricao: string;
  valor: number | string;
  data_vencimento: string | null;
  parcela_atual: number | null;
  parcela_total: number | null;
  grupo_parcelamento: string | null;
  pago: boolean;
}

export function agruparParcelamentosAtivos(linhas: LinhaParcelamento[]): ParcelamentoAtivo[] {
  const grupos = new Map<
    string,
    { descricao: string; valor: number; parcela_total: number; parcelasPagas: number; dataFim: string | null }
  >();

  for (const linha of linhas) {
    if (!linha.grupo_parcelamento || !linha.parcela_total) continue;
    const atual = grupos.get(linha.grupo_parcelamento) ?? {
      descricao: linha.descricao,
      valor: Number(linha.valor),
      parcela_total: linha.parcela_total,
      parcelasPagas: 0,
      dataFim: null,
    };
    if (linha.pago) atual.parcelasPagas = Math.max(atual.parcelasPagas, linha.parcela_atual ?? 0);
    if (linha.parcela_atual === linha.parcela_total) atual.dataFim = linha.data_vencimento;
    grupos.set(linha.grupo_parcelamento, atual);
  }

  return Array.from(grupos.values())
    .filter((g) => g.parcelasPagas < g.parcela_total)
    .map((g) => ({
      descricao: g.descricao,
      valorParcela: g.valor,
      parcelaAtual: g.parcelasPagas,
      parcelaTotal: g.parcela_total,
      dataFim: g.dataFim,
    }))
    .sort((a, b) => {
      if (!a.dataFim) return 1;
      if (!b.dataFim) return -1;
      return a.dataFim.localeCompare(b.dataFim);
    });
}
