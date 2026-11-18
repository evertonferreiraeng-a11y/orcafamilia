import { createServerSupabase } from '@/lib/supabase-server';
import { ComprasJpClient } from '@/components/jp/ComprasJpClient';
import { resumoJp } from '@/lib/jp';
import type { JpCompra } from '@/types/database';

export const metadata = { title: 'JP – Lista de compras' };
export const dynamic = 'force-dynamic';

export default async function JpComprasPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [compras, convidados] = await Promise.all([
    supabase.from('jp_compras').select('*').order('ordem').order('criado_em').range(0, 4999),
    supabase.from('jp_convidados').select('convite, nome, enviado, resposta').range(0, 4999),
  ]);

  if (compras.error) {
    return (
      <div className="card mx-auto max-w-xl p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Não foi possível abrir a lista de compras</h2>
        <p className="text-sm text-gray-600">
          {compras.error.message.includes('jp_compras')
            ? 'A tabela da lista de compras ainda não existe no banco. Rode a migração supabase/migrations/0030_jp_compras.sql no SQL Editor do Supabase.'
            : compras.error.message}
        </p>
      </div>
    );
  }

  const n = (v: unknown) => Number(v) || 0;
  const lista = ((compras.data ?? []) as JpCompra[]).map((c) => ({
    ...c,
    quantidade: n(c.quantidade),
    valor_unitario: n(c.valor_unitario),
    valor_pago: c.valor_pago === null ? null : n(c.valor_pago),
  }));
  const familiasVao = convidados.error ? null : resumoJp(convidados.data ?? []).familiasVao;

  return <ComprasJpClient inicial={lista} familiasVao={familiasVao} />;
}
