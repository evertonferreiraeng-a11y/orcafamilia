import { createServerSupabase } from '@/lib/supabase-server';
import { parseMesParam, primeiroDiaMes, ultimoDiaMes } from '@/lib/utils';
import { FamiliaClient, type VisaoFamilia } from '@/components/familia/FamiliaClient';
import type { Conta, Transacao, Divida, Meta } from '@/types/database';

export default async function FamiliaPage({
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

  const { data: membros } = await supabase.from('familia_membros').select('user_id');
  const userIds = (membros ?? []).map((m) => m.user_id);
  const conjugeId = userIds.find((id) => id !== user.id) ?? null;

  const [{ data: contas }, { data: transacoesContas }, { data: transacoesPeriodo }, { data: dividas }, { data: metas }] =
    await Promise.all([
      supabase.from('contas').select('*').in('user_id', userIds).eq('ativa', true),
      supabase
        .from('transacoes')
        .select('user_id, conta_id, tipo, valor')
        .in('user_id', userIds)
        .eq('pago', true)
        .not('conta_id', 'is', null),
      supabase
        .from('transacoes')
        .select('user_id, tipo, valor')
        .in('user_id', userIds)
        .eq('eh_transferencia', false)
        .gte('data', inicio)
        .lte('data', fim),
      supabase.from('dividas').select('*').in('user_id', userIds).eq('status', 'ativa').order('data_vencimento'),
      supabase.from('metas').select('*').in('user_id', userIds).order('criado_em', { ascending: false }),
    ]);

  const saldoPorConta = new Map<string, number>();
  for (const conta of (contas ?? []) as Conta[]) {
    saldoPorConta.set(conta.id, Number(conta.saldo_inicial));
  }
  for (const t of (transacoesContas ?? []) as Pick<Transacao, 'conta_id' | 'tipo' | 'valor'>[]) {
    if (!t.conta_id) continue;
    const atual = saldoPorConta.get(t.conta_id) ?? 0;
    const sinal = t.tipo === 'receita' ? 1 : -1;
    saldoPorConta.set(t.conta_id, atual + sinal * Number(t.valor));
  }

  function montarVisao(userId: string | null): VisaoFamilia {
    const contasFiltradas = ((contas ?? []) as Conta[]).filter((c) => (userId ? c.user_id === userId : true));
    const periodoFiltrado = ((transacoesPeriodo ?? []) as Pick<Transacao, 'user_id' | 'tipo' | 'valor'>[]).filter((t) =>
      userId ? t.user_id === userId : true
    );
    const dividasFiltradas = ((dividas ?? []) as Divida[]).filter((d) => (userId ? d.user_id === userId : true));
    const metasFiltradas = ((metas ?? []) as Meta[]).filter((m) => (userId ? m.user_id === userId : true));

    const receita = periodoFiltrado.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0);
    const despesa = periodoFiltrado.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0);

    return {
      receita,
      despesa,
      saldo: receita - despesa,
      contas: contasFiltradas.map((c) => ({
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
        cor: c.cor,
        saldo: saldoPorConta.get(c.id) ?? 0,
      })),
      dividas: dividasFiltradas.map((d) => ({
        id: d.id,
        descricao: d.descricao,
        saldoDevedor: Number(d.valor_total) - Number(d.valor_pago),
        dataVencimento: d.data_vencimento,
        status: d.status,
      })),
      metas: metasFiltradas.map((m) => ({
        id: m.id,
        nome: m.nome,
        valorAtual: Number(m.valor_atual),
        valorAlvo: Number(m.valor_alvo),
      })),
    };
  }

  return (
    <FamiliaClient
      consolidado={montarVisao(null)}
      voce={montarVisao(user.id)}
      conjuge={conjugeId ? montarVisao(conjugeId) : montarVisao('__nenhum__')}
      temConjuge={Boolean(conjugeId)}
    />
  );
}
