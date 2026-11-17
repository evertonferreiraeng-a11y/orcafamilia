import { createServerSupabase } from '@/lib/supabase-server';
import { AjustesVida } from '@/components/vida/AjustesVida';
import { ConfigurarVida } from '@/components/vida/ConfigurarVida';
import { chaveConfigurada, MODELO_PADRAO } from '@/lib/vida/ia';
import { INSTRUCOES_PADRAO } from '@/lib/vida/instrucoes';

export const dynamic = 'force-dynamic';

export default async function AjustesVidaPage() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from('vida_contexto').select('texto').maybeSingle();
  const chaveOk = chaveConfigurada();
  if (error) return <ConfigurarVida faltaBanco faltaChave={!chaveOk} />;
  const personalizado = Boolean(data?.texto?.trim());
  return (
    <div className="space-y-5">
      {!chaveOk && <ConfigurarVida faltaBanco={false} faltaChave />}
      <AjustesVida
        textoInicial={personalizado ? data!.texto : INSTRUCOES_PADRAO}
        padrao={INSTRUCOES_PADRAO}
        personalizado={personalizado}
        chaveOk={chaveOk}
        modelo={process.env.ANTHROPIC_MODEL || MODELO_PADRAO}
      />
    </div>
  );
}
