// Regras do app Casa (puras, sem dependências).
// Registrar/desfazer execução roda no banco (casa_registrar_execucao / casa_desfazer_execucao);
// aqui ficam datas, status, alertas e relatórios.
import { diasAte, fmtData, hojeISO, soma, type Relatorio } from '@/lib/estoque/calc';
import type { CasaConfig, CasaExecucao, CasaItem, CasaPrestador, CasaTarefa, UnidadeFrequencia } from '@/types/database';

export type DadosCasa = {
  config: CasaConfig;
  prestadores: CasaPrestador[];
  itens: CasaItem[];
  tarefas: CasaTarefa[];
  execucoes: CasaExecucao[];
};

export type StatusTarefa = 'vencida' | 'breve' | 'emdia' | 'semdata' | 'pausada';
export type StatusGarantia = 'vencida' | 'breve' | 'ok' | 'none';

export const UNIDADES_FREQ: Record<UnidadeFrequencia, { sing: string; plural: string }> = {
  dias: { sing: 'dia', plural: 'dias' },
  semanas: { sing: 'semana', plural: 'semanas' },
  meses: { sing: 'mês', plural: 'meses' },
  anos: { sing: 'ano', plural: 'anos' },
};
export const STATUS_TAREFA: Record<StatusTarefa, string> = {
  vencida: 'Vencida',
  breve: 'Vence em breve',
  emdia: 'Em dia',
  semdata: 'Sem data definida',
  pausada: 'Pausada',
};
export const STATUS_GARANTIA: Record<StatusGarantia, string> = {
  vencida: 'Garantia vencida',
  breve: 'Garantia vence em até 90 dias',
  ok: 'Na garantia',
  none: 'Sem garantia informada',
};
export const CATEGORIAS_CASA = [
  'Água',
  'Climatização',
  'Hidráulica',
  'Elétrica',
  'Eletrodomésticos',
  'Gás',
  'Telhado',
  'Controle de pragas',
  'Jardim e área externa',
  'Segurança',
  'Pintura e estrutura',
  'Limpeza',
  'Outros',
];
export const COMODOS = ['Cozinha', 'Sala', 'Quarto do casal', 'Quarto do bebê', 'Banheiro', 'Lavanderia', 'Área externa', 'Garagem', 'Escritório'];

/** Soma uma frequência a uma data ISO (igual ao Postgres: 31/jan + 1 mês = 28/fev). */
export function somarPeriodo(iso: string, valor: number, unidade: UnidadeFrequencia): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  let data: Date;
  if (unidade === 'dias' || unidade === 'semanas') {
    data = new Date(Date.UTC(a, m - 1, d + valor * (unidade === 'semanas' ? 7 : 1)));
  } else {
    const meses = unidade === 'anos' ? valor * 12 : valor;
    const alvoAno = a + Math.floor((m - 1 + meses) / 12);
    const alvoMes = (((m - 1 + meses) % 12) + 12) % 12;
    const ultimoDia = new Date(Date.UTC(alvoAno, alvoMes + 1, 0)).getUTCDate();
    data = new Date(Date.UTC(alvoAno, alvoMes, Math.min(d, ultimoDia)));
  }
  return data.toISOString().slice(0, 10);
}

export function textoFrequencia(valor: number, unidade: UnidadeFrequencia): string {
  if (valor === 1) return { dias: 'todo dia', semanas: 'toda semana', meses: 'todo mês', anos: 'todo ano' }[unidade];
  return `a cada ${valor} ${UNIDADES_FREQ[unidade].plural}`;
}

export function statusTarefa(t: CasaTarefa, hoje = hojeISO()): StatusTarefa {
  if (!t.ativa) return 'pausada';
  const n = diasAte(t.proxima_data, hoje);
  if (n === null) return 'semdata';
  if (n < 0) return 'vencida';
  if (n <= t.aviso_dias) return 'breve';
  return 'emdia';
}

export function textoPrazoTarefa(t: CasaTarefa): string {
  const n = diasAte(t.proxima_data);
  if (n === null) return '—';
  if (n < 0) return `atrasada há ${-n} d`;
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  return `em ${n} d`;
}

export function statusGarantia(i: CasaItem, hoje = hojeISO()): StatusGarantia {
  const n = diasAte(i.garantia_ate, hoje);
  if (n === null) return 'none';
  if (n < 0) return 'vencida';
  if (n <= 90) return 'breve';
  return 'ok';
}

const PESO: Record<StatusTarefa, number> = { vencida: 0, breve: 1, semdata: 2, emdia: 3, pausada: 4 };
/** Ordem de prioridade: vencidas, em breve, sem data, em dia, pausadas; dentro do grupo, pela data. */
export const ordemTarefas = (a: CasaTarefa, b: CasaTarefa) =>
  PESO[statusTarefa(a)] - PESO[statusTarefa(b)] ||
  (a.proxima_data || '9999').localeCompare(b.proxima_data || '9999') ||
  a.titulo.localeCompare(b.titulo, 'pt-BR');

export const nomeTarefa = (d: DadosCasa, t: CasaTarefa) => {
  const item = t.item_id ? d.itens.find((i) => i.id === t.item_id) : undefined;
  return item ? `${t.titulo} · ${item.nome}${item.comodo ? ` (${item.comodo})` : ''}` : t.titulo;
};
export const categoriaTarefa = (d: DadosCasa, t: CasaTarefa) => (t.item_id ? d.itens.find((i) => i.id === t.item_id)?.categoria : undefined) || t.categoria;

export const gastoNoPeriodo = (d: DadosCasa, prefixo: string) => soma(d.execucoes.filter((e) => e.data.startsWith(prefixo)), (e) => e.custo);

export const categoriasUsadas = (d: DadosCasa) =>
  [...new Set([...CATEGORIAS_CASA, ...d.itens.map((i) => i.categoria), ...d.tarefas.map((t) => t.categoria)])].filter(Boolean);
export const comodosUsados = (d: DadosCasa) => [...new Set([...COMODOS, ...d.itens.map((i) => i.comodo).filter((c): c is string => !!c)])];

/** Agenda dos próximos meses: cada manutenção ativa aparece em todas as datas previstas até o fim do período. */
export function agenda(d: DadosCasa, meses = 12, hoje = hojeISO()) {
  const fim = somarPeriodo(hoje.slice(0, 8) + '01', meses, 'meses');
  const eventos: { data: string; tarefa: CasaTarefa; atrasada: boolean }[] = [];
  for (const t of d.tarefas) {
    if (!t.ativa || !t.proxima_data) continue;
    let data = t.proxima_data;
    let guarda = 0;
    if (data < hoje) {
      eventos.push({ data, tarefa: t, atrasada: true });
      data = somarPeriodo(data, t.freq_valor, t.freq_unidade);
      while (data < hoje && guarda++ < 500) data = somarPeriodo(data, t.freq_valor, t.freq_unidade);
    }
    while (data < fim && guarda++ < 500) {
      eventos.push({ data, tarefa: t, atrasada: false });
      data = somarPeriodo(data, t.freq_valor, t.freq_unidade);
    }
  }
  return eventos.sort((a, b) => a.data.localeCompare(b.data));
}

/** Custo anual estimado das manutenções ativas (pelo custo estimado ou pela média do histórico). */
export function custoAnualEstimado(d: DadosCasa): number {
  const porAno: Record<UnidadeFrequencia, number> = { dias: 365, semanas: 52, meses: 12, anos: 1 };
  return soma(d.tarefas.filter((t) => t.ativa), (t) => {
    const hist = d.execucoes.filter((e) => e.tarefa_id === t.id && e.custo > 0);
    const custo = t.custo_estimado > 0 ? t.custo_estimado : hist.length ? soma(hist, (e) => e.custo) / hist.length : 0;
    return (custo * porAno[t.freq_unidade]) / t.freq_valor;
  });
}

export function relatorioHistorico(d: DadosCasa, execs: CasaExecucao[]): Relatorio {
  return {
    colunas: [
      { titulo: 'Data', chave: 'data' },
      { titulo: 'Manutenção', chave: 'tarefa' },
      { titulo: 'Categoria', chave: 'cat' },
      { titulo: 'Prestador', chave: 'prest' },
      { titulo: 'Custo', chave: 'custo', tipo: 'moeda' },
      { titulo: 'Observações', chave: 'obs' },
    ],
    linhas: execs.map((e) => {
      const t = d.tarefas.find((x) => x.id === e.tarefa_id);
      return {
        data: fmtData(e.data),
        tarefa: t ? nomeTarefa(d, t) : '(excluída)',
        cat: t ? categoriaTarefa(d, t) : '',
        prest: d.prestadores.find((p) => p.id === e.prestador_id)?.nome ?? '',
        custo: e.custo,
        obs: e.obs,
      };
    }),
    totais: ['custo'],
  };
}

/** Link de WhatsApp a partir de um telefone brasileiro digitado livremente. */
export function linkWhatsApp(telefone?: string | null): string | null {
  const n = (telefone || '').replace(/\D/g, '');
  if (n.length < 10) return null;
  return `https://wa.me/${n.length <= 11 ? `55${n}` : n}`;
}

export function mensagemErroCasa(e: { message?: string } | null | undefined): string {
  const m = e?.message || '';
  if (m.includes('DATA_INVALIDA')) return 'A data não pode ser futura.';
  if (m.includes('CUSTO_INVALIDO')) return 'O custo não pode ser negativo.';
  if (m.includes('PROXIMA_INVALIDA')) return 'A próxima data deve ser posterior à data em que foi feito.';
  if (m.includes('TAREFA_INVALIDA')) return 'Manutenção não encontrada.';
  if (m.includes('EXECUCAO_INVALIDA')) return 'Registro não encontrado.';
  if (m.includes('SEM_FAMILIA')) return 'Seu usuário não está vinculado a uma família.';
  if (m.includes('casa_prestadores_nome_uk')) return 'Já existe um prestador com esse nome.';
  if (m.includes('casa_tarefas_freq_check')) return 'Frequência inválida.';
  if (m.includes('Failed to fetch') || m.includes('NetworkError')) return 'Sem conexão com a internet. Tente novamente.';
  return m || 'Não foi possível concluir a operação.';
}
