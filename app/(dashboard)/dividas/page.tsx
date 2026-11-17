import { createServerSupabase } from '@/lib/supabase-server';
import { DividasClient } from '@/components/dividas/DividasClient';

export default async function DividasPage({ searchParams }: { searchParams: { aba?: string } }) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Sobra média dos últimos 3 meses fechados (sugere quanto dá para colocar nas dívidas)
  const hoje = new Date();
  const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const [{ data: dividas }, { data: categorias }, { data: subcategorias }, { data: contas }, { data: tx }] = await Promise.all([
    supabase.from('dividas').select('*').eq('user_id', user.id).order('data_vencimento', { ascending: true }),
    supabase.from('categorias').select('*').eq('user_id', user.id).eq('tipo', 'despesa').order('nome'),
    supabase.from('subcategorias').select('*').eq('user_id', user.id).order('nome'),
    supabase.from('contas').select('*').eq('user_id', user.id).eq('ativa', true).order('nome'),
    supabase
      .from('transacoes')
      .select('data, tipo, valor')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .gte('data', ymd(ini))
      .lte('data', ymd(fim)),
  ]);

  const porMes = new Map<string, number>();
  for (const t of tx ?? []) {
    const k = t.data.slice(0, 7);
    porMes.set(k, (porMes.get(k) ?? 0) + (t.tipo === 'receita' ? Number(t.valor) : -Number(t.valor)));
  }
  const sobraMedia = porMes.size ? Array.from(porMes.values()).reduce((a, b) => a + b, 0) / porMes.size : null;

  return (
    <DividasClient
      dividas={dividas ?? []}
      categorias={categorias ?? []}
      subcategorias={subcategorias ?? []}
      contas={contas ?? []}
      sobraMedia={sobraMedia}
      abaInicial={searchParams.aba === 'plano' ? 'plano' : 'lista'}
    />
  );
}
