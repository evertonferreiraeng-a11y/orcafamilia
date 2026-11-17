import { createServerSupabase } from '@/lib/supabase-server';
import { PlanosVida } from '@/components/vida/PlanosVida';
import { ConfigurarVida } from '@/components/vida/ConfigurarVida';
import { chaveConfigurada } from '@/lib/vida/ia';
import { carregarFinancas, valorDaFonte } from '@/lib/vida/financas';

export const dynamic = 'force-dynamic';

export default async function PlanosVidaPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: planos, error }, { data: etapas }, { data: indicadores }] = await Promise.all([
    supabase.from('vida_planos').select('*').order('atualizado_em', { ascending: false }),
    supabase.from('vida_etapas').select('*').order('ordem'),
    supabase.from('vida_indicadores').select('*').order('ordem'),
  ]);
  if (error) return <ConfigurarVida faltaBanco faltaChave={!chaveConfigurada()} migracao="0025_vida_planos.sql" />;

  // Indicadores automáticos: grava o valor de hoje (1 por dia) a partir dos dados do Life.
  const ativos = new Set((planos ?? []).filter((p) => p.status !== 'concluido').map((p) => p.id));
  const autos = (indicadores ?? []).filter((i) => i.fonte !== 'manual' && ativos.has(i.plano_id));
  if (autos.length) {
    const fin = await carregarFinancas(supabase, user.id).catch(() => null);
    if (fin) {
      const regs = autos
        .map((i) => ({ indicador_id: i.id, valor: valorDaFonte(fin, i.fonte) }))
        .filter((r): r is { indicador_id: string; valor: number } => r.valor != null);
      if (regs.length) await supabase.from('vida_registros').upsert(regs, { onConflict: 'indicador_id,data' });
    }
  }
  const { data: registros } = await supabase.from('vida_registros').select('*').order('data');

  return <PlanosVida planos={planos ?? []} etapas={etapas ?? []} indicadores={indicadores ?? []} registros={(registros ?? []).map((r) => ({ ...r, valor: Number(r.valor) }))} />;
}
