// Edge Function agendada (cron diário) que verifica saldo baixo, dívidas
// próximas do vencimento e orçamentos estourando, e dispara alertas via
// WhatsApp — registrando cada envio em notificacoes_log.
//
// Deploy: supabase functions deploy alertas-diarios
// Agendamento: ver migração 0003_cron_alertas.sql (pg_cron + pg_net)

// @ts-ignore - resolvido pelo runtime Deno da Supabase Edge Function
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { sendWhatsapp, whatsappConfigFromEnv } from './whatsapp.ts';

// @ts-ignore - global disponível no runtime Deno
const env = (key: string): string | undefined => Deno.env.get(key);

function formatBRL(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function primeiroDiaMesISO(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
}

function ultimoDiaMesISO(): string {
  const hoje = new Date();
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`;
}

function somarDias(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

async function jaNotificadoHoje(supabase: SupabaseClient, userId: string, tipo: string): Promise<boolean> {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('notificacoes_log')
    .select('id')
    .eq('user_id', userId)
    .eq('tipo', tipo)
    .gte('enviado_em', inicioHoje.toISOString())
    .limit(1);

  return (data?.length ?? 0) > 0;
}

async function registrarLog(
  supabase: SupabaseClient,
  userId: string,
  tipo: string,
  mensagem: string,
  ok: boolean
): Promise<void> {
  await supabase.from('notificacoes_log').insert({
    user_id: userId,
    tipo,
    mensagem,
    status: ok ? 'enviado' : 'erro',
  });
}

async function verificarSaldoBaixo(supabase: SupabaseClient, whatsappConfig: ReturnType<typeof whatsappConfigFromEnv>) {
  let enviados = 0;

  const { data: configs } = await supabase
    .from('alertas_config')
    .select('user_id, telefone, alerta_saldo_limite')
    .eq('alerta_saldo_ativo', true);

  for (const cfg of configs ?? []) {
    if (cfg.alerta_saldo_limite == null || !cfg.telefone) continue;
    if (await jaNotificadoHoje(supabase, cfg.user_id, 'saldo')) continue;

    const { data: contas } = await supabase
      .from('contas')
      .select('id, saldo_inicial')
      .eq('user_id', cfg.user_id)
      .eq('ativa', true);

    if (!contas || contas.length === 0) continue;

    const contaIds = contas.map((c: { id: string }) => c.id);
    const { data: transacoes } = await supabase
      .from('transacoes')
      .select('conta_id, tipo, valor')
      .eq('user_id', cfg.user_id)
      .in('conta_id', contaIds);

    let saldo = contas.reduce((acc: number, c: { saldo_inicial: number }) => acc + Number(c.saldo_inicial), 0);
    for (const t of transacoes ?? []) {
      saldo += (t.tipo === 'receita' ? 1 : -1) * Number(t.valor);
    }

    if (saldo < Number(cfg.alerta_saldo_limite)) {
      const mensagem = `Seu saldo total está em ${formatBRL(saldo)}, abaixo do limite configurado de ${formatBRL(
        Number(cfg.alerta_saldo_limite)
      )}.`;
      const resultado = await sendWhatsapp(whatsappConfig, cfg.telefone, mensagem);
      await registrarLog(supabase, cfg.user_id, 'saldo', mensagem, resultado.ok);
      enviados++;
    }
  }

  return enviados;
}

async function verificarDividasVencendo(supabase: SupabaseClient, whatsappConfig: ReturnType<typeof whatsappConfigFromEnv>) {
  let enviados = 0;

  const { data: configs } = await supabase
    .from('alertas_config')
    .select('user_id, telefone, alerta_divida_dias_antes')
    .eq('alerta_divida_ativo', true);

  for (const cfg of configs ?? []) {
    if (!cfg.telefone) continue;
    if (await jaNotificadoHoje(supabase, cfg.user_id, 'divida')) continue;

    const dataLimite = somarDias(cfg.alerta_divida_dias_antes ?? 3);

    const { data: dividas } = await supabase
      .from('dividas')
      .select('descricao, data_vencimento, valor_total, valor_pago')
      .eq('user_id', cfg.user_id)
      .eq('status', 'ativa')
      .gte('data_vencimento', hojeISO())
      .lte('data_vencimento', dataLimite);

    if (!dividas || dividas.length === 0) continue;

    const linhas = dividas.map(
      (d: { descricao: string; data_vencimento: string; valor_total: number; valor_pago: number }) =>
        `${d.descricao}: ${formatBRL(Number(d.valor_total) - Number(d.valor_pago))} vence em ${d.data_vencimento}`
    );
    const mensagem = `Você tem ${dividas.length} dívida(s) próxima(s) do vencimento:\n${linhas.join('\n')}`;

    const resultado = await sendWhatsapp(whatsappConfig, cfg.telefone, mensagem);
    await registrarLog(supabase, cfg.user_id, 'divida', mensagem, resultado.ok);
    enviados++;
  }

  return enviados;
}

async function verificarOrcamentosEstourando(
  supabase: SupabaseClient,
  whatsappConfig: ReturnType<typeof whatsappConfigFromEnv>
) {
  let enviados = 0;
  const mesReferencia = primeiroDiaMesISO();
  const fimMes = ultimoDiaMesISO();

  const { data: configs } = await supabase
    .from('alertas_config')
    .select('user_id, telefone, alerta_orcamento_percentual')
    .eq('alerta_orcamento_ativo', true);

  for (const cfg of configs ?? []) {
    if (!cfg.telefone) continue;
    if (await jaNotificadoHoje(supabase, cfg.user_id, 'orcamento')) continue;

    const { data: orcamentos } = await supabase
      .from('orcamentos')
      .select('categoria_id, valor_limite, categorias(nome)')
      .eq('user_id', cfg.user_id)
      .eq('mes_referencia', mesReferencia);

    if (!orcamentos || orcamentos.length === 0) continue;

    const { data: transacoes } = await supabase
      .from('transacoes')
      .select('categoria_id, valor')
      .eq('user_id', cfg.user_id)
      .eq('tipo', 'despesa')
      .gte('data', mesReferencia)
      .lte('data', fimMes);

    const gastoPorCategoria = new Map<string, number>();
    for (const t of transacoes ?? []) {
      gastoPorCategoria.set(t.categoria_id, (gastoPorCategoria.get(t.categoria_id) ?? 0) + Number(t.valor));
    }

    const estourando: string[] = [];
    for (const o of orcamentos) {
      const gasto = gastoPorCategoria.get(o.categoria_id) ?? 0;
      const percentual = (gasto / Number(o.valor_limite)) * 100;
      if (percentual >= Number(cfg.alerta_orcamento_percentual)) {
        const categoria = o.categorias as unknown as { nome: string } | null;
        estourando.push(`${categoria?.nome ?? 'Categoria'}: ${percentual.toFixed(0)}% (${formatBRL(gasto)} de ${formatBRL(Number(o.valor_limite))})`);
      }
    }

    if (estourando.length === 0) continue;

    const mensagem = `Orçamento(s) atingindo o limite configurado:\n${estourando.join('\n')}`;
    const resultado = await sendWhatsapp(whatsappConfig, cfg.telefone, mensagem);
    await registrarLog(supabase, cfg.user_id, 'orcamento', mensagem, resultado.ok);
    enviados++;
  }

  return enviados;
}

// @ts-ignore - global disponível no runtime Deno
Deno.serve(async (_req: Request) => {
  const supabaseUrl = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente do Supabase ausentes.' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const whatsappConfig = whatsappConfigFromEnv(env);

  const [saldo, divida, orcamento] = await Promise.all([
    verificarSaldoBaixo(supabase, whatsappConfig),
    verificarDividasVencendo(supabase, whatsappConfig),
    verificarOrcamentosEstourando(supabase, whatsappConfig),
  ]);

  return new Response(
    JSON.stringify({ ok: true, alertas_enviados: { saldo, divida, orcamento } }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
