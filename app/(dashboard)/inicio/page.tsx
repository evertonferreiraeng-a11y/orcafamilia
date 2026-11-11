import { createServerSupabase } from '@/lib/supabase-server';
import { carregarEstoque } from '@/lib/estoque/carregar';
import { carregarCasa } from '@/lib/casa/carregar';
import { nomeTarefa, ordemTarefas, statusTarefa, textoPrazoTarefa } from '@/lib/casa/calc';
import { alertaLote, estoqueAtual, fmtMoeda, itensParaComprar, percentualReserva, soma, statusProduto } from '@/lib/estoque/calc';
import { PortalInicio, type AlertaPortal, type ResumoPortal } from '@/components/portal/PortalInicio';

export const metadata = { title: 'Início – Apps da família' };
export const dynamic = 'force-dynamic';

const FUSO = 'America/Sao_Paulo';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Data/hora de agora no fuso do Brasil (o servidor da Vercel roda em UTC). */
function agoraBrasil() {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  const hoje = `${partes.year}-${partes.month}-${partes.day}`;
  const dataExtenso = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return { hoje, hora: Number(partes.hour), dataExtenso };
}
function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default async function InicioPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { hoje, hora, dataExtenso } = agoraBrasil();
  const mes = hoje.slice(0, 7);
  const inicioMes = `${mes}-01`;
  const fimMes = new Date(Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const em7 = somarDias(hoje, 7);
  const ha90 = somarDias(hoje, -90);

  const [{ data: perfil }, estoque, casa, mesTx, pendentes] = await Promise.all([
    supabase.from('perfis').select('nome').eq('id', user.id).maybeSingle(),
    carregarEstoque(supabase).catch(() => null), // migração 0019 ainda não aplicada
    carregarCasa(supabase).catch(() => null), // migração 0020 ainda não aplicada
    supabase.from('transacoes').select('tipo, valor').eq('user_id', user.id).eq('eh_transferencia', false).gte('data', inicioMes).lte('data', fimMes),
    supabase
      .from('transacoes')
      .select('valor, data, data_vencimento')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .eq('tipo', 'despesa')
      .eq('pago', false)
      .gte('data', ha90),
  ]);

  const alertas: AlertaPortal[] = [];

  /* Orçamento */
  let orcamento: ResumoPortal['orcamento'] = null;
  if (!mesTx.error) {
    const tx = mesTx.data ?? [];
    const receitas = soma(tx.filter((t) => t.tipo === 'receita'), (t) => Number(t.valor));
    const despesas = soma(tx.filter((t) => t.tipo === 'despesa'), (t) => Number(t.valor));
    // vencimento = data_vencimento (quando houver) ou a data do lançamento
    const pend = (pendentes.error ? [] : pendentes.data ?? []).map((t) => ({ valor: Number(t.valor), venc: (t.data_vencimento || t.data).slice(0, 10) }));
    const atrasadas = pend.filter((t) => t.venc < hoje);
    const aVencer = pend.filter((t) => t.venc >= hoje && t.venc <= em7);
    orcamento = {
      receitas,
      despesas,
      saldo: receitas - despesas,
      atrasadas: atrasadas.length,
      atrasadasValor: soma(atrasadas, (t) => t.valor),
      aPagar: aVencer.length,
      aPagarValor: soma(aVencer, (t) => t.valor),
    };
    if (orcamento.atrasadas)
      alertas.push({ app: 'orcamento', nivel: 'urgente', texto: `${plural(orcamento.atrasadas, 'conta', 'contas')} em atraso`, detalhe: fmtMoeda(orcamento.atrasadasValor), href: '/transacoes' });
    if (orcamento.aPagar)
      alertas.push({ app: 'orcamento', nivel: 'atencao', texto: `${plural(orcamento.aPagar, 'conta vence', 'contas vencem')} em 7 dias`, detalhe: fmtMoeda(orcamento.aPagarValor), href: '/transacoes' });
  }

  /* Estoque */
  let resumoEstoque: ResumoPortal['estoque'] = null;
  if (estoque) {
    const ativos = estoque.lotes.filter((l) => l.qtd_atual > 0);
    const vencidos = ativos.filter((l) => alertaLote(l) === 'venc');
    const d30 = ativos.filter((l) => alertaLote(l) === 'd30');
    const aguas = estoque.produtos.filter((p) => p.tipo === 'agua');
    const comprar = itensParaComprar(estoque);
    const nomes = (ls: typeof ativos) => [...new Set(ls.map((l) => estoque.produtos.find((p) => p.id === l.produto_id)?.nome).filter(Boolean))].slice(0, 3).join(', ');
    resumoEstoque = {
      reserva: percentualReserva(estoque, ['alimento', 'agua']),
      litros: soma(aguas, (p) => estoqueAtual(estoque, p)),
      litrosMeta: soma(aguas, (p) => p.meta),
      vencendo: vencidos.length + d30.length,
      comprar: comprar.length,
      semEstoque: comprar.filter((i) => statusProduto(estoque, i.produto) === 'red').length,
    };
    if (vencidos.length) alertas.push({ app: 'estoque', nivel: 'urgente', texto: `${plural(vencidos.length, 'lote vencido', 'lotes vencidos')} no estoque`, detalhe: nomes(vencidos), href: '/estoque/lotes' });
    if (d30.length) alertas.push({ app: 'estoque', nivel: 'atencao', texto: `${plural(d30.length, 'lote vence', 'lotes vencem')} em até 30 dias`, detalhe: nomes(d30), href: '/estoque/lotes' });
    if (comprar.length)
      alertas.push({
        app: 'estoque',
        nivel: 'info',
        texto: `${plural(comprar.length, 'produto abaixo', 'produtos abaixo')} da meta`,
        detalhe: comprar.slice(0, 3).map((i) => i.produto.nome).join(', '),
        href: '/estoque/compras',
      });
  }

  /* Casa */
  let resumoCasa: ResumoPortal['casa'] = null;
  if (casa) {
    const por = (s: ReturnType<typeof statusTarefa>) => casa.tarefas.filter((t) => statusTarefa(t) === s);
    const vencidas = por('vencida').sort(ordemTarefas);
    const breve = por('breve');
    const semData = por('semdata');
    const proxima = casa.tarefas.filter((t) => t.ativa && t.proxima_data && t.proxima_data >= hoje).sort(ordemTarefas)[0];
    resumoCasa = {
      vencidas: vencidas.length,
      breve: breve.length,
      emDia: por('emdia').length,
      semData: semData.length,
      pausadas: por('pausada').length,
      proxima: proxima ? { titulo: nomeTarefa(casa, proxima), data: proxima.proxima_data! } : null,
    };
    if (vencidas.length === 1) alertas.push({ app: 'casa', nivel: 'urgente', texto: nomeTarefa(casa, vencidas[0]), detalhe: textoPrazoTarefa(vencidas[0]), href: '/casa/manutencoes?status=vencida' });
    else if (vencidas.length > 1) alertas.push({ app: 'casa', nivel: 'urgente', texto: `${vencidas.length} manutenções vencidas`, href: '/casa/manutencoes?status=vencida' });
    if (breve.length) alertas.push({ app: 'casa', nivel: 'atencao', texto: `${plural(breve.length, 'manutenção vence', 'manutenções vencem')} em breve`, href: '/casa/manutencoes?status=breve' });
    if (semData.length) alertas.push({ app: 'casa', nivel: 'info', texto: `${plural(semData.length, 'manutenção', 'manutenções')} sem data`, detalhe: 'informe a última vez', href: '/casa/manutencoes?status=semdata' });
  }

  const ordem = { urgente: 0, atencao: 1, info: 2 } as const;
  alertas.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);

  const resumo: ResumoPortal = {
    nome: (perfil?.nome || 'família').split(' ')[0],
    saudacao: hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite',
    dataExtenso,
    mesExtenso: MESES[Number(mes.slice(5, 7)) - 1],
    orcamento,
    estoque: resumoEstoque,
    casa: resumoCasa,
    alertas,
  };

  return <PortalInicio resumo={resumo} />;
}
