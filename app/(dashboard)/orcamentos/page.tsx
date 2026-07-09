import { createServerSupabase } from '@/lib/supabase-server';
import { OrcamentosClient, type CategoriaAnual } from '@/components/orcamentos/OrcamentosClient';

export default async function OrcamentosPage({
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

  const [{ data: categoriasTodas }, { data: subcategoriasTodas }, { data: orcamentosAno }] = await Promise.all([
    supabase.from('categorias').select('id, nome, tipo, cor').eq('user_id', user.id).order('nome'),
    supabase.from('subcategorias').select('id, nome, categoria_id').eq('user_id', user.id).order('nome'),
    supabase
      .from('orcamentos')
      .select('categoria_id, subcategoria_id, valor_limite, mes_referencia')
      .eq('user_id', user.id)
      .gte('mes_referencia', `${ano}-01-01`)
      .lte('mes_referencia', `${ano}-12-01`),
  ]);

  function buscarLimite(categoriaId: string, subcategoriaId: string | null, mesIndex: number): number | null {
    const mesRef = `${ano}-${String(mesIndex + 1).padStart(2, '0')}-01`;
    const linha = (orcamentosAno ?? []).find(
      (o) =>
        o.categoria_id === categoriaId &&
        o.mes_referencia === mesRef &&
        (subcategoriaId ? o.subcategoria_id === subcategoriaId : !o.subcategoria_id)
    );
    return linha ? Number(linha.valor_limite) : null;
  }

  function construirCategoria(categoria: { id: string; nome: string; cor: string | null }): CategoriaAnual {
    const valoresPorMes = Array.from({ length: 12 }, (_, i) => buscarLimite(categoria.id, null, i));
    const subcategorias = (subcategoriasTodas ?? [])
      .filter((s) => s.categoria_id === categoria.id)
      .map((s) => ({
        id: s.id,
        nome: s.nome,
        valoresPorMes: Array.from({ length: 12 }, (_, i) => buscarLimite(categoria.id, s.id, i)),
      }));
    return { id: categoria.id, nome: categoria.nome, cor: categoria.cor, valoresPorMes, subcategorias };
  }

  const categoriasReceita = (categoriasTodas ?? []).filter((c) => c.tipo === 'receita').map(construirCategoria);
  const categoriasDespesa = (categoriasTodas ?? []).filter((c) => c.tipo === 'despesa').map(construirCategoria);

  return <OrcamentosClient ano={ano} categoriasReceita={categoriasReceita} categoriasDespesa={categoriasDespesa} />;
}
