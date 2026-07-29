import { Suspense } from 'react';
import { createServerSupabase } from '@/lib/supabase-server';
import { parseMesParam, primeiroDiaMes, ultimoDiaMes } from '@/lib/utils';
import { SeletorMesAno } from '@/components/transacoes/SeletorMesAno';
import { TransacoesClient, type TransacaoComRelacoes } from '@/components/transacoes/TransacoesClient';
import type { Categoria, Subcategoria, Conta, Cartao } from '@/types/database';

export default async function TransacoesPage({
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
  const inicio = primeiroDiaMes(mesSelecionado);
  const fim = ultimoDiaMes(mesSelecionado);

  const [{ data: categorias }, { data: subcategorias }, { data: contas }, { data: cartoes }] = await Promise.all([
    supabase.from('categorias').select('*').eq('user_id', user.id).order('nome'),
    supabase.from('subcategorias').select('*').eq('user_id', user.id).order('nome'),
    supabase.from('contas').select('*').eq('user_id', user.id).order('nome'),
    supabase.from('cartoes').select('*').eq('user_id', user.id).order('nome'),
  ]);

  const { data: transacoesBrutas } = await supabase
    .from('transacoes')
    .select('*, categorias(nome, cor), subcategorias(nome), contas(nome), cartoes(nome)')
    .eq('user_id', user.id)
    .or(
      `and(eh_transferencia.eq.false,data_vencimento.gte.${inicio},data_vencimento.lte.${fim}),and(eh_transferencia.eq.true,data.gte.${inicio},data.lte.${fim})`
    )
    .order('data_vencimento', { ascending: false });

  const transacoes: TransacaoComRelacoes[] = (transacoesBrutas ?? []).map((t) => {
    const categoria = t.categorias as unknown as { nome: string; cor: string | null } | null;
    const subcategoria = t.subcategorias as unknown as { nome: string } | null;
    const conta = t.contas as unknown as { nome: string } | null;
    const cartao = t.cartoes as unknown as { nome: string } | null;
    return {
      ...t,
      valor: Number(t.valor),
      categoriaNome: categoria?.nome ?? null,
      categoriaCor: categoria?.cor ?? null,
      subcategoriaNome: subcategoria?.nome ?? null,
      contaNome: conta?.nome ?? null,
      cartaoNome: cartao?.nome ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <TransacoesClient
        transacoes={transacoes}
        categorias={(categorias ?? []) as Categoria[]}
        subcategorias={(subcategorias ?? []) as Subcategoria[]}
        contas={(contas ?? []) as Conta[]}
        cartoes={(cartoes ?? []) as Cartao[]}
        seletorMes={
          <Suspense fallback={null}>
            <SeletorMesAno />
          </Suspense>
        }
      />
    </div>
  );
}
