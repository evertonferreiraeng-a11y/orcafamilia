import { createServerSupabase } from '@/lib/supabase-server';
import { parseMesParam, primeiroDiaMes, ultimoDiaMes, addMeses } from '@/lib/utils';
import { OrcamentosClient, type CategoriaOrcamento } from '@/components/orcamentos/OrcamentosClient';
import type { PontoTendencia } from '@/components/orcamentos/OrcamentoTendenciaChart';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const mesSelecionado = parseMesParam(searchParams.mes);
  const mesReferencia = primeiroDiaMes(mesSelecionado);
  const inicio = mesReferencia;
  const fim = ultimoDiaMes(mesSelecionado);

  const mesAnterior = addMeses(mesSelecionado, -1);
  const inicioAnterior = primeiroDiaMes(mesAnterior);
  const fimAnterior = ultimoDiaMes(mesAnterior);

  const mesesTendencia = Array.from({ length: 6 }, (_, i) => addMeses(mesSelecionado, i - 5));
  const inicioTendencia = primeiroDiaMes(mesesTendencia[0]);

  const [
    { data: categoriasDespesa },
    { data: subcategoriasTodas },
    { data: orcamentosPeriodo },
    { data: despesasPeriodo },
  ] = await Promise.all([
    supabase.from('categorias').select('*').eq('user_id', user.id).eq('tipo', 'despesa').order('nome'),
    supabase.from('subcategorias').select('*').eq('user_id', user.id).order('nome'),
    supabase
      .from('orcamentos')
      .select('categoria_id, subcategoria_id, valor_limite, mes_referencia')
      .eq('user_id', user.id)
      .gte('mes_referencia', inicioTendencia)
      .lte('mes_referencia', mesReferencia),
    supabase
      .from('transacoes')
      .select('categoria_id, subcategoria_id, valor, data')
      .eq('user_id', user.id)
      .eq('tipo', 'despesa')
      .eq('eh_transferencia', false)
      .gte('data', inicioTendencia)
      .lte('data', fim),
  ]);

  function somarGasto(categoriaId: string, subcategoriaId: string | null, deIni: string, ateFim: string): number {
    return (despesasPeriodo ?? [])
      .filter((t) => t.categoria_id === categoriaId && t.data >= deIni && t.data <= ateFim)
      .filter((t) => (subcategoriaId ? t.subcategoria_id === subcategoriaId : true))
      .reduce((a, t) => a + Number(t.valor), 0);
  }

  function buscarLimite(categoriaId: string, subcategoriaId: string | null, mesRef: string): number | null {
    const linha = (orcamentosPeriodo ?? []).find(
      (o) => o.categoria_id === categoriaId && o.mes_referencia === mesRef && (subcategoriaId ? o.subcategoria_id === subcategoriaId : !o.subcategoria_id)
    );
    return linha ? Number(linha.valor_limite) : null;
  }

  const categorias: CategoriaOrcamento[] = (categoriasDespesa ?? []).map((c) => {
    const subcategorias = (subcategoriasTodas ?? [])
      .filter((s) => s.categoria_id === c.id)
      .map((s) => ({
        id: s.id,
        nome: s.nome,
        valorLimite: buscarLimite(c.id, s.id, mesReferencia),
        gasto: somarGasto(c.id, s.id, inicio, fim),
        gastoAnterior: somarGasto(c.id, s.id, inicioAnterior, fimAnterior),
      }));

    return {
      id: c.id,
      nome: c.nome,
      cor: c.cor,
      valorLimite: buscarLimite(c.id, null, mesReferencia),
      gasto: somarGasto(c.id, null, inicio, fim),
      gastoAnterior: somarGasto(c.id, null, inicioAnterior, fimAnterior),
      subcategorias,
    };
  });

  const tendencia: PontoTendencia[] = mesesTendencia.map((data) => {
    const inicioMes = primeiroDiaMes(data);
    const fimMes = ultimoDiaMes(data);
    const orcado = (orcamentosPeriodo ?? [])
      .filter((o) => o.mes_referencia === inicioMes && !o.subcategoria_id)
      .reduce((a, o) => a + Number(o.valor_limite), 0);
    const gasto = (despesasPeriodo ?? [])
      .filter((t) => t.data >= inicioMes && t.data <= fimMes)
      .reduce((a, t) => a + Number(t.valor), 0);
    return { label: `${MESES_ABREV[data.getMonth()]}/${String(data.getFullYear()).slice(2)}`, orcado, gasto };
  });

  return <OrcamentosClient categorias={categorias} mesReferencia={mesReferencia} tendencia={tendencia} />;
}
