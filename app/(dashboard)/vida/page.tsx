import { createServerSupabase } from '@/lib/supabase-server';
import { PainelVida } from '@/components/vida/PainelVida';
import { ConfigurarVida } from '@/components/vida/ConfigurarVida';
import { chaveConfigurada } from '@/lib/vida/ia';
import { mesRef } from '@/lib/vida/pilares';

export const dynamic = 'force-dynamic';

export default async function VidaPage({ searchParams }: { searchParams: { mes?: string } }) {
  const supabase = createServerSupabase();
  const mesAtual = mesRef();
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? '') && `${searchParams.mes}-01` <= mesAtual ? `${searchParams.mes}-01` : mesAtual;
  const [a, m] = mes.split('-').map(Number);
  const inicioHist = mesRef(new Date(a, m - 1 - 5, 1));

  const [{ data: hist, error }, { count }] = await Promise.all([
    supabase
      .from('vida_avaliacoes')
      .select('mes, pilar, nota, situacao, problema, objetivo, proxima_acao, indicador, origem, atualizado_em')
      .gte('mes', inicioHist)
      .lte('mes', mes),
    supabase.from('vida_conversas').select('id', { count: 'exact', head: true }),
  ]);

  if (error) return <ConfigurarVida faltaBanco faltaChave={!chaveConfigurada()} />;

  const historico = (hist ?? []).map((x) => ({ ...x, nota: x.nota == null ? null : Number(x.nota) }));
  return (
    <PainelVida
      mes={mes}
      mesAtual={mesAtual}
      avaliacoes={historico.filter((x) => x.mes === mes)}
      historico={historico}
      totalConversas={count ?? 0}
      chaveOk={chaveConfigurada()}
    />
  );
}
