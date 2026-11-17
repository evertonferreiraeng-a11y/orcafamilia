import { createServerSupabase } from '@/lib/supabase-server';
import { SimuladorDividas } from '@/components/vida/SimuladorDividas';
import { ConfigurarVida } from '@/components/vida/ConfigurarVida';
import { chaveConfigurada } from '@/lib/vida/ia';
import { carregarFinancas } from '@/lib/vida/financas';

export const dynamic = 'force-dynamic';

export default async function DividasVidaPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { error } = await supabase.from('vida_dividas_params').select('divida_id').limit(1);
  if (error) return <ConfigurarVida faltaBanco faltaChave={!chaveConfigurada()} migracao="0025_vida_planos.sql" />;

  const fin = await carregarFinancas(supabase, user.id);
  return <SimuladorDividas dividas={fin.dividas} sobraMedia={fin.sobraMedia ?? (fin.mes.receita > 0 ? fin.mes.sobra : null)} />;
}
