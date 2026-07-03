import { Suspense } from 'react';
import { createServerSupabase } from '@/lib/supabase-server';
import { parseMesParam, primeiroDiaMes, ultimoDiaMes } from '@/lib/utils';
import { FiltrosTransacoes } from '@/components/transacoes/FiltrosTransacoes';
import { TransacoesClient, type TransacaoComSaldo } from '@/components/transacoes/TransacoesClient';
import type { Categoria, Conta, Cartao } from '@/types/database';

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: { mes?: string; tipo?: string; categoria?: string; conta?: string };
}) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const mesSelecionado = parseMesParam(searchParams.mes);
  const inicio = primeiroDiaMes(mesSelecionado);
  const fim = ultimoDiaMes(mesSelecionado);

  const [{ data: categorias }, { data: contas }, { data: cartoes }] = await Promise.all([
    supabase.from('categorias').select('*').eq('user_id', user.id).order('nome'),
    supabase.from('contas').select('*').eq('user_id', user.id).order('nome'),
    supabase.from('cartoes').select('*').eq('user_id', user.id).order('nome'),
  ]);

  let query = supabase
    .from('transacoes')
    .select('*, categorias(nome, cor), contas(nome), cartoes(nome)')
    .eq('user_id', user.id)
    .gte('data', inicio)
    .lte('data', fim);

  if (searchParams.tipo) query = query.eq('tipo', searchParams.tipo);
  if (searchParams.categoria) query = query.eq('categoria_id', searchParams.categoria);
  if (searchParams.conta) query = query.eq('conta_id', searchParams.conta);

  const { data: transacoesBrutas } = await query.order('data', { ascending: true });

  let saldoAcumulado = 0;
  const transacoes: TransacaoComSaldo[] = (transacoesBrutas ?? []).map((t) => {
    const categoria = t.categorias as unknown as { nome: string; cor: string | null } | null;
    const conta = t.contas as unknown as { nome: string } | null;
    const cartao = t.cartoes as unknown as { nome: string } | null;
    const sinal = t.tipo === 'receita' ? 1 : -1;
    saldoAcumulado += sinal * Number(t.valor);

    return {
      ...t,
      valor: Number(t.valor),
      categoriaNome: categoria?.nome ?? 'Sem categoria',
      categoriaCor: categoria?.cor ?? null,
      contaNome: conta?.nome ?? null,
      cartaoNome: cartao?.nome ?? null,
      saldoCorrente: saldoAcumulado,
    };
  });

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <FiltrosTransacoes categorias={(categorias ?? []) as Categoria[]} contas={(contas ?? []) as Conta[]} />
      </Suspense>
      <TransacoesClient
        transacoes={transacoes}
        categorias={(categorias ?? []) as Categoria[]}
        contas={(contas ?? []) as Conta[]}
        cartoes={(cartoes ?? []) as Cartao[]}
      />
    </div>
  );
}
