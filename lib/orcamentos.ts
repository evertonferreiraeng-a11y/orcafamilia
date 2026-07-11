/**
 * Regra central de "quanto está orçado numa categoria": quando a categoria
 * tem subcategorias, o valor efetivo é a soma delas; senão, é o valor
 * lançado na própria categoria. Único lugar onde essa regra deve existir —
 * Dashboard, Indicadores e a grade de Orçamentos usam esta mesma função
 * para nunca divergir entre si.
 */
export function resolverValorEfetivo(temSubcategorias: boolean, valorProprio: number | null, somaSubcategorias: number): number {
  return temSubcategorias ? somaSubcategorias : (valorProprio ?? 0);
}

export interface OrcamentoLinha {
  categoria_id: string;
  subcategoria_id: string | null;
  valor_limite: number;
  mes_referencia: string;
}

export function indexarSubcategoriasPorCategoria(subcategorias: { id: string; categoria_id: string }[]): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const s of subcategorias) {
    const lista = mapa.get(s.categoria_id) ?? [];
    lista.push(s.id);
    mapa.set(s.categoria_id, lista);
  }
  return mapa;
}

export function orcadoEfetivoCategoria(
  orcamentos: OrcamentoLinha[],
  subcategoriaIdsPorCategoria: Map<string, string[]>,
  categoriaId: string,
  mesReferencia: string
): number {
  const temSub = (subcategoriaIdsPorCategoria.get(categoriaId)?.length ?? 0) > 0;
  const somaSubcategorias = temSub
    ? orcamentos
        .filter((o) => o.subcategoria_id && o.categoria_id === categoriaId && o.mes_referencia === mesReferencia)
        .reduce((a, o) => a + Number(o.valor_limite), 0)
    : 0;
  const linhaCategoria = orcamentos.find(
    (o) => !o.subcategoria_id && o.categoria_id === categoriaId && o.mes_referencia === mesReferencia
  );
  return resolverValorEfetivo(temSub, linhaCategoria ? Number(linhaCategoria.valor_limite) : null, somaSubcategorias);
}
