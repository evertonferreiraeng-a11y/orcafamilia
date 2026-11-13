import { eachDayOfInterval, format, addDays, differenceInCalendarDays } from 'date-fns';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  parseMesParam,
  primeiroDiaMes,
  ultimoDiaMes,
  addMeses,
  nomeMes,
} from '@/lib/utils';
import { indexarSubcategoriasPorCategoria, orcadoEfetivoCategoria } from '@/lib/orcamentos';
import { gerarInsights, type DadosGerente } from '@/lib/gerente';
import { HeroOrcamento } from '@/components/dashboard/HeroOrcamento';
import { MinhasContasCarousel } from '@/components/dashboard/MinhasContasCarousel';
import { BalancoMensalChart, type PontoBalanco } from '@/components/dashboard/BalancoMensalChart';
import { GerenteFinanceiroCard } from '@/components/dashboard/GerenteFinanceiroCard';
import { DespesasPorTipoCard, type CategoriaExecutadoOrcado } from '@/components/dashboard/DespesasPorTipoCard';
import { ProximosVencimentosCard, type VencimentoItem } from '@/components/dashboard/ProximosVencimentosCard';
import { ParaOndeFoiCard } from '@/components/dashboard/ParaOndeFoiCard';
import { IconTrendUp, IconRecorrente, IconCompras } from '@/components/icons';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default async function DashboardPage({
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

  const mesAnterior = addMeses(mesSelecionado, -1);
  const inicioAnterior = primeiroDiaMes(mesAnterior);
  const fimAnterior = ultimoDiaMes(mesAnterior);
  const anoAtual = mesSelecionado.getFullYear();
  const hojeStr = format(new Date(), 'yyyy-MM-dd');
  const em7DiasStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  const em15DiasStr = format(addDays(new Date(), 15), 'yyyy-MM-dd');
  const em45DiasStr = format(addDays(new Date(), 45), 'yyyy-MM-dd');

  const [
    { data: contas },
    { data: transacoesContas },
    { data: transacoesPeriodo },
    { data: transacoesMesAnterior },
    { data: orcamentosMes },
    { data: despesasPorCategoriaMes },
    { data: receitasPorCategoriaMes },
    { data: categoriasTodas },
    { data: subcategoriasTodas },
    { data: transacoesMultiAno },
    { data: dividasProximas },
    { data: dividasAtivasTodas },
    { data: pendentesProximas },
  ] = await Promise.all([
    supabase.from('contas').select('*').eq('user_id', user.id).eq('ativa', true).order('nome'),
    supabase
      .from('transacoes')
      .select('conta_id, tipo, valor')
      .eq('user_id', user.id)
      .eq('pago', true)
      .not('conta_id', 'is', null),
    supabase
      .from('transacoes')
      .select('valor, data, data_vencimento, tipo, pago, tipo_despesa, descricao, parcela_atual, parcela_total')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data', { ascending: false }),
    supabase
      .from('transacoes')
      .select('tipo, valor, tipo_despesa')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .gte('data', inicioAnterior)
      .lte('data', fimAnterior),
    supabase
      .from('orcamentos')
      .select('valor_limite, categoria_id, subcategoria_id, mes_referencia')
      .eq('user_id', user.id)
      .eq('mes_referencia', inicio),
    supabase
      .from('transacoes')
      .select('categoria_id, subcategoria_id, valor, pago, tipo_despesa')
      .eq('user_id', user.id)
      .eq('tipo', 'despesa')
      .eq('eh_transferencia', false)
      .gte('data', inicio)
      .lte('data', fim),
    supabase
      .from('transacoes')
      .select('categoria_id, subcategoria_id, valor, pago')
      .eq('user_id', user.id)
      .eq('tipo', 'receita')
      .eq('eh_transferencia', false)
      .gte('data', inicio)
      .lte('data', fim),
    supabase.from('categorias').select('id, nome, cor, icone, tipo').eq('user_id', user.id),
    supabase.from('subcategorias').select('id, categoria_id, nome').eq('user_id', user.id),
    supabase
      .from('transacoes')
      .select('data, tipo, valor, pago, categoria_id')
      .eq('user_id', user.id)
      .eq('eh_transferencia', false)
      .gte('data', `${anoAtual}-01-01`)
      .lte('data', `${anoAtual}-12-31`),
    supabase
      .from('dividas')
      .select('descricao, valor_total, valor_pago, parcelas_total, data_vencimento')
      .eq('user_id', user.id)
      .eq('status', 'ativa')
      .gte('data_vencimento', hojeStr)
      .lte('data_vencimento', em7DiasStr),
    supabase.from('dividas').select('valor_total, valor_pago').eq('user_id', user.id).eq('status', 'ativa'),
    // Pendentes para "Próximos vencimentos" (atrasadas + até 15 dias). Busca com folga pela data
    // de lançamento porque o vencimento pode ser depois dela.
    supabase
      .from('transacoes')
      .select('id, descricao, valor, tipo, data, data_vencimento, categoria_id')
      .eq('user_id', user.id)
      .eq('pago', false)
      .eq('eh_transferencia', false)
      .lte('data', em45DiasStr)
      .order('data', { ascending: true })
      .limit(300),
  ]);

  const subcategoriaIdsPorCategoria = indexarSubcategoriasPorCategoria(subcategoriasTodas ?? []);

  const orcamentosEfetivosMes = (categoriasTodas ?? [])
    .filter((c) => c.tipo === 'despesa')
    .map((c) => ({
      categoria_id: c.id,
      valor_limite: orcadoEfetivoCategoria(orcamentosMes ?? [], subcategoriaIdsPorCategoria, c.id, inicio),
    }))
    .filter((o) => o.valor_limite > 0);

  const saldoPorConta = new Map<string, number>();
  for (const conta of contas ?? []) {
    saldoPorConta.set(conta.id, Number(conta.saldo_inicial));
  }
  for (const t of transacoesContas ?? []) {
    if (!t.conta_id) continue;
    const atual = saldoPorConta.get(t.conta_id) ?? 0;
    const sinal = t.tipo === 'receita' ? 1 : -1;
    saldoPorConta.set(t.conta_id, atual + sinal * Number(t.valor));
  }

  const saldoTotalContas = Array.from(saldoPorConta.values()).reduce((a, b) => a + b, 0);

  const periodo = transacoesPeriodo ?? [];
  const realizado = periodo.filter((t) => t.pago);
  const pendente = periodo.filter((t) => !t.pago);

  const receitaMes = realizado.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0);
  const despesaMes = realizado.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0);
  const saldoMes = receitaMes - despesaMes;

  const pendenteReceita = pendente.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0);
  const pendenteDespesa = pendente.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0);
  const despesasPendentes = pendente.filter((t) => t.tipo === 'despesa');
  const despesasAtrasadas = despesasPendentes.filter((t) => (t.data_vencimento ?? t.data) < hojeStr);

  const mesAnteriorTransacoes = transacoesMesAnterior ?? [];

  const saldoInicioMes = saldoTotalContas - saldoMes;
  // Acumulado: saldo bancário atual + tudo que ainda falta receber/pagar neste mês.
  const saldoPrevistoAcumulado = saldoTotalContas + pendenteReceita - pendenteDespesa;
  // Isolado ao mês, só o que já foi pago: receita paga - despesa paga (sem saldo anterior). É o mesmo que saldoMes.
  const saldoMesExecutado = saldoMes;
  // Isolado ao mês, com tudo: receita total (paga + a receber) - despesa total (paga + a pagar), sem saldo anterior.
  const previsaoSaldoMesTotal = receitaMes + pendenteReceita - (despesaMes + pendenteDespesa);


  const gastoPorCategoria = new Map<string, number>();
  const gastoPorCategoriaFixa = new Map<string, number>();
  const gastoPorCategoriaVariavel = new Map<string, number>();
  const gastoPorSubcategoriaFixa = new Map<string, number>();
  const gastoPorSubcategoriaVariavel = new Map<string, number>();
  for (const t of despesasPorCategoriaMes ?? []) {
    if (!t.categoria_id) continue;
    gastoPorCategoria.set(t.categoria_id, (gastoPorCategoria.get(t.categoria_id) ?? 0) + Number(t.valor));
    if (t.tipo_despesa === 'fixa') {
      gastoPorCategoriaFixa.set(t.categoria_id, (gastoPorCategoriaFixa.get(t.categoria_id) ?? 0) + Number(t.valor));
      if (t.subcategoria_id) {
        gastoPorSubcategoriaFixa.set(t.subcategoria_id, (gastoPorSubcategoriaFixa.get(t.subcategoria_id) ?? 0) + Number(t.valor));
      }
    } else if (t.tipo_despesa === 'variavel') {
      gastoPorCategoriaVariavel.set(t.categoria_id, (gastoPorCategoriaVariavel.get(t.categoria_id) ?? 0) + Number(t.valor));
      if (t.subcategoria_id) {
        gastoPorSubcategoriaVariavel.set(
          t.subcategoria_id,
          (gastoPorSubcategoriaVariavel.get(t.subcategoria_id) ?? 0) + Number(t.valor)
        );
      }
    }
  }
  const nomePorCategoria = new Map((categoriasTodas ?? []).map((c) => [c.id, c.nome]));
  const categoriasAcimaDetalhe = orcamentosEfetivosMes
    .filter((o) => (gastoPorCategoria.get(o.categoria_id) ?? 0) > o.valor_limite)
    .map((o) => {
      const gasto = gastoPorCategoria.get(o.categoria_id) ?? 0;
      return {
        nome: nomePorCategoria.get(o.categoria_id) ?? 'Categoria',
        percentual: o.valor_limite > 0 ? (gasto / o.valor_limite) * 100 : 0,
      };
    });

  const orcadoPorCategoria = new Map(orcamentosEfetivosMes.map((o) => [o.categoria_id, o.valor_limite]));

  const orcadoPorSubcategoria = new Map<string, number>();
  for (const o of orcamentosMes ?? []) {
    if (!o.subcategoria_id) continue;
    orcadoPorSubcategoria.set(o.subcategoria_id, (orcadoPorSubcategoria.get(o.subcategoria_id) ?? 0) + Number(o.valor_limite));
  }

  const subcategoriasPorCategoriaDetalhe = new Map<string, { id: string; nome: string }[]>();
  for (const s of subcategoriasTodas ?? []) {
    const lista = subcategoriasPorCategoriaDetalhe.get(s.categoria_id) ?? [];
    lista.push({ id: s.id, nome: s.nome });
    subcategoriasPorCategoriaDetalhe.set(s.categoria_id, lista);
  }

  const categoriasDespesa = (categoriasTodas ?? []).filter((c) => c.tipo === 'despesa');

  // O orçamento é definido por categoria (não por fixa/variável), então uma mesma categoria
  // pode ter uma única verba mensal. Para não repetir esse valor cheio nos dois cards (o que dá a
  // falsa impressão de orçamento em dobro), o orçado é dividido entre Fixas e Variáveis
  // proporcionalmente a onde a categoria realmente teve gasto neste mês.
  function dividirOrcado(execFixa: number, execVariavel: number, orcadoTotal: number): { fixa: number; variavel: number } {
    if (orcadoTotal <= 0) return { fixa: 0, variavel: 0 };
    if (execFixa > 0 && execVariavel > 0) {
      const totalExec = execFixa + execVariavel;
      const fixa = orcadoTotal * (execFixa / totalExec);
      return { fixa, variavel: orcadoTotal - fixa };
    }
    if (execFixa > 0) return { fixa: orcadoTotal, variavel: 0 };
    if (execVariavel > 0) return { fixa: 0, variavel: orcadoTotal };
    return { fixa: orcadoTotal, variavel: 0 };
  }

  const categoriasFixasDetalhe: CategoriaExecutadoOrcado[] = categoriasDespesa
    .map((c) => {
      const execFixa = gastoPorCategoriaFixa.get(c.id) ?? 0;
      const execVariavel = gastoPorCategoriaVariavel.get(c.id) ?? 0;
      const orcadoDividido = dividirOrcado(execFixa, execVariavel, orcadoPorCategoria.get(c.id) ?? 0);
      return {
        id: c.id,
        nome: c.nome,
        cor: c.cor,
        icone: c.icone,
        executado: execFixa,
        orcado: orcadoDividido.fixa,
        subcategorias: (subcategoriasPorCategoriaDetalhe.get(c.id) ?? []).map((s) => {
          const sExecFixa = gastoPorSubcategoriaFixa.get(s.id) ?? 0;
          const sExecVariavel = gastoPorSubcategoriaVariavel.get(s.id) ?? 0;
          const sOrcadoDividido = dividirOrcado(sExecFixa, sExecVariavel, orcadoPorSubcategoria.get(s.id) ?? 0);
          return {
            id: s.id,
            nome: s.nome,
            executado: sExecFixa,
            orcado: sOrcadoDividido.fixa,
          };
        }),
      };
    })
    .filter((c) => c.executado > 0 || c.orcado > 0);

  const categoriasVariaveisDetalhe: CategoriaExecutadoOrcado[] = categoriasDespesa
    .map((c) => {
      const execFixa = gastoPorCategoriaFixa.get(c.id) ?? 0;
      const execVariavel = gastoPorCategoriaVariavel.get(c.id) ?? 0;
      const orcadoDividido = dividirOrcado(execFixa, execVariavel, orcadoPorCategoria.get(c.id) ?? 0);
      return {
        id: c.id,
        nome: c.nome,
        cor: c.cor,
        icone: c.icone,
        executado: execVariavel,
        orcado: orcadoDividido.variavel,
        subcategorias: (subcategoriasPorCategoriaDetalhe.get(c.id) ?? []).map((s) => {
          const sExecFixa = gastoPorSubcategoriaFixa.get(s.id) ?? 0;
          const sExecVariavel = gastoPorSubcategoriaVariavel.get(s.id) ?? 0;
          const sOrcadoDividido = dividirOrcado(sExecFixa, sExecVariavel, orcadoPorSubcategoria.get(s.id) ?? 0);
          return {
            id: s.id,
            nome: s.nome,
            executado: sExecVariavel,
            orcado: sOrcadoDividido.variavel,
          };
        }),
      };
    })
    .filter((c) => c.executado > 0 || c.orcado > 0);

  const orcadoFixasTotal = categoriasFixasDetalhe.reduce((a, c) => a + c.orcado, 0);
  const orcadoVariaveisTotal = categoriasVariaveisDetalhe.reduce((a, c) => a + c.orcado, 0);

  const totalGastoCategorias = (despesasPorCategoriaMes ?? []).reduce((a, t) => a + Number(t.valor), 0);

  const gastoPorCategoriaReceita = new Map<string, number>();
  const gastoPorSubcategoriaReceita = new Map<string, number>();
  for (const t of receitasPorCategoriaMes ?? []) {
    if (!t.categoria_id) continue;
    gastoPorCategoriaReceita.set(t.categoria_id, (gastoPorCategoriaReceita.get(t.categoria_id) ?? 0) + Number(t.valor));
    if (t.subcategoria_id) {
      gastoPorSubcategoriaReceita.set(
        t.subcategoria_id,
        (gastoPorSubcategoriaReceita.get(t.subcategoria_id) ?? 0) + Number(t.valor)
      );
    }
  }

  const categoriasReceitaTodas = (categoriasTodas ?? []).filter((c) => c.tipo === 'receita');
  const orcadoPorCategoriaReceita = new Map(
    categoriasReceitaTodas.map((c) => [
      c.id,
      orcadoEfetivoCategoria(orcamentosMes ?? [], subcategoriaIdsPorCategoria, c.id, inicio),
    ])
  );

  const categoriasReceitaDetalhe: CategoriaExecutadoOrcado[] = categoriasReceitaTodas
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      cor: c.cor,
      icone: c.icone,
      executado: gastoPorCategoriaReceita.get(c.id) ?? 0,
      orcado: orcadoPorCategoriaReceita.get(c.id) ?? 0,
      subcategorias: (subcategoriasPorCategoriaDetalhe.get(c.id) ?? []).map((s) => ({
        id: s.id,
        nome: s.nome,
        executado: gastoPorSubcategoriaReceita.get(s.id) ?? 0,
        orcado: orcadoPorSubcategoria.get(s.id) ?? 0,
      })),
    }))
    .filter((c) => c.executado > 0 || c.orcado > 0);

  const orcadoReceitaTotal = categoriasReceitaDetalhe.reduce((a, c) => a + c.orcado, 0);
  const totalReceitaCategorias = (receitasPorCategoriaMes ?? []).reduce((a, t) => a + Number(t.valor), 0);

  const despesaFixaMes = periodo
    .filter((t) => t.tipo === 'despesa' && t.tipo_despesa === 'fixa')
    .reduce((a, t) => a + Number(t.valor), 0);
  const despesaFixaMesAnterior = mesAnteriorTransacoes
    .filter((t) => t.tipo === 'despesa' && t.tipo_despesa === 'fixa')
    .reduce((a, t) => a + Number(t.valor), 0);

  const gastoFixoMes = despesaFixaMes;
  const gastoVariavelMes = totalGastoCategorias - gastoFixoMes;

  const parcelamentosTerminandoMes = periodo
    .filter((t) => t.tipo === 'despesa' && t.parcela_total !== null && t.parcela_atual === t.parcela_total)
    .map((t) => ({ descricao: t.descricao, valorParcela: Number(t.valor) }));

  const dividasVencendo = (dividasProximas ?? []).map((d) => {
    const restante = Number(d.valor_total) - Number(d.valor_pago);
    const valorParcela = d.parcelas_total ? Number(d.valor_total) / d.parcelas_total : restante;
    return {
      descricao: d.descricao,
      valorParcela: Math.min(valorParcela, restante),
      diasRestantes: differenceInCalendarDays(new Date(`${d.data_vencimento}T00:00:00`), new Date(`${hojeStr}T00:00:00`)),
    };
  });

  const dividasAtivasTotal = (dividasAtivasTodas ?? []).reduce(
    (a, d) => a + Math.max(0, Number(d.valor_total) - Number(d.valor_pago)),
    0
  );

  const dadosGerente: DadosGerente = {
    saldoTotalContas,
    receitaMes,
    despesaMes,
    despesaFixaMes,
    despesaFixaMesAnterior,
    categoriasAcima: categoriasAcimaDetalhe,
    dividasVencendo,
    parcelamentosTerminandoMes,
    dividasAtivasTotal,
  };
  const insights = gerarInsights(dadosGerente);

  const diasDoMes = eachDayOfInterval({
    start: new Date(`${inicio}T00:00:00`),
    end: new Date(`${fim}T00:00:00`),
  });

  const fluxo: PontoBalanco[] = diasDoMes.map((dia) => {
    const chave = format(dia, 'yyyy-MM-dd');
    const doDia = periodo.filter((t) => t.data === chave);
    return {
      label: format(dia, 'dd'),
      receita: doDia.filter((t) => t.tipo === 'receita').reduce((a, t) => a + Number(t.valor), 0),
      despesa: doDia.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0),
      receitaPago: doDia.filter((t) => t.tipo === 'receita' && t.pago).reduce((a, t) => a + Number(t.valor), 0),
      despesaPago: doDia.filter((t) => t.tipo === 'despesa' && t.pago).reduce((a, t) => a + Number(t.valor), 0),
    };
  });

  const balancoAnual: PontoBalanco[] = MESES_ABREV.map((label) => ({
    label,
    receita: 0,
    despesa: 0,
    receitaPago: 0,
    despesaPago: 0,
  }));
  for (const t of transacoesMultiAno ?? []) {
    const mesT = Number(t.data.split('-')[1]);
    const idx = mesT - 1;
    if (t.tipo === 'receita') {
      balancoAnual[idx].receita += Number(t.valor);
      if (t.pago) balancoAnual[idx].receitaPago += Number(t.valor);
    } else {
      balancoAnual[idx].despesa += Number(t.valor);
      if (t.pago) balancoAnual[idx].despesaPago += Number(t.valor);
    }
  }

  const categoriaPorId = new Map<string, { nome: string; icone: string | null; cor: string | null }>(
    (categoriasTodas ?? []).map((c) => [c.id, { nome: c.nome, icone: c.icone, cor: c.cor }])
  );
  const vencimentos: VencimentoItem[] = (pendentesProximas ?? [])
    .map((t) => {
      const cat = t.categoria_id ? categoriaPorId.get(t.categoria_id) : undefined;
      return {
        id: t.id,
        descricao: t.descricao,
        valor: Number(t.valor),
        tipo: t.tipo as 'receita' | 'despesa',
        vencimento: t.data_vencimento ?? t.data,
        categoriaNome: cat?.nome ?? null,
        categoriaIcone: cat?.icone ?? null,
        categoriaCor: cat?.cor ?? null,
      };
    })
    .filter((v) => v.vencimento <= em15DiasStr)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  const fatiasGasto = categoriasDespesa.map((c) => ({
    id: c.id,
    nome: c.nome,
    cor: c.cor,
    icone: c.icone,
    executado: gastoPorCategoria.get(c.id) ?? 0,
    orcado: orcadoPorCategoria.get(c.id) ?? 0,
  }));

  const baseHrefDetalhe = `/orcamentos?ano=${anoAtual}&mes=${mesSelecionado.getMonth() + 1}&categoria=`;
  const hrefDetalhe = (id: string) => `${baseHrefDetalhe}${id}`;

  return (
    <div className="space-y-5">
      <HeroOrcamento
        mesNome={nomeMes(mesSelecionado)}
        mesParam={searchParams.mes}
        saldoContas={saldoTotalContas}
        saldoPrevisto={saldoPrevistoAcumulado}
        saldoAnterior={saldoInicioMes}
        receita={receitaMes}
        aReceber={pendenteReceita}
        despesa={despesaMes}
        aPagar={pendenteDespesa}
        resultadoMes={saldoMesExecutado}
        previsaoMes={previsaoSaldoMesTotal}
        orcado={orcadoFixasTotal + orcadoVariaveisTotal}
        gastoOrcavel={totalGastoCategorias}
        atrasadas={{ qtd: despesasAtrasadas.length, valor: despesasAtrasadas.reduce((a, t) => a + Number(t.valor), 0) }}
        pendentes={{ qtd: despesasPendentes.length, valor: pendenteDespesa }}
        categoriasAcima={categoriasAcimaDetalhe.length}
        dividasVencendo={dividasVencendo.length}
      />

      <div className="anim-subir" style={{ animationDelay: '80ms' }}>
        <GerenteFinanceiroCard insights={insights} />
      </div>

      <div className="anim-subir grid grid-cols-1 gap-4 lg:grid-cols-5" style={{ animationDelay: '140ms' }}>
        <div className="lg:col-span-2">
          <ProximosVencimentosCard itens={vencimentos} hoje={hojeStr} />
        </div>
        <div className="lg:col-span-3">
          <ParaOndeFoiCard categorias={fatiasGasto} baseHrefDetalhe={baseHrefDetalhe} />
        </div>
      </div>

      <div className="anim-subir grid grid-cols-1 gap-4 lg:grid-cols-4" style={{ animationDelay: '200ms' }}>
        <div className="card flex flex-col p-4 lg:col-span-3 lg:min-h-[440px]">
          <BalancoMensalChart diario={fluxo} mensal={balancoAnual} />
        </div>

        <div className="flex flex-col gap-4">
          <MinhasContasCarousel
            contas={(contas ?? []).map((conta) => ({
              id: conta.id,
              nome: conta.nome,
              tipo: conta.tipo,
              saldo: saldoPorConta.get(conta.id) ?? 0,
              cor: conta.cor,
            }))}
          />
        </div>
      </div>

      <div className="anim-subir grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ animationDelay: '260ms' }}>
        <DespesasPorTipoCard
          titulo="Receitas"
          icon={IconTrendUp}
          tom="receita"
          categorias={categoriasReceitaDetalhe}
          totalExecutado={totalReceitaCategorias}
          totalOrcado={orcadoReceitaTotal}
          totalGeral={totalReceitaCategorias}
          mostrarPercentualTitulo={false}
          mensagemVazio="Nenhuma receita registrada neste mês."
          hrefDetalhe={hrefDetalhe}
        />
        <DespesasPorTipoCard
          titulo="Despesas Fixas"
          icon={IconRecorrente}
          tom="fixa"
          categorias={categoriasFixasDetalhe}
          totalExecutado={despesaFixaMes}
          totalOrcado={orcadoFixasTotal}
          totalGeral={totalGastoCategorias}
          hrefDetalhe={hrefDetalhe}
        />
        <DespesasPorTipoCard
          titulo="Despesas Variáveis"
          icon={IconCompras}
          tom="variavel"
          categorias={categoriasVariaveisDetalhe}
          totalExecutado={gastoVariavelMes}
          totalOrcado={orcadoVariaveisTotal}
          totalGeral={totalGastoCategorias}
          hrefDetalhe={hrefDetalhe}
        />
      </div>
    </div>
  );
}
