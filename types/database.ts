export type TipoConta = 'corrente' | 'poupanca' | 'investimento' | 'dinheiro';
export type TipoLancamento = 'receita' | 'despesa';
export type TipoDespesa = 'fixa' | 'variavel';
export type Frequencia = 'mensal' | 'semanal';
export type StatusDivida = 'ativa' | 'quitada';
export type SituacaoDivida = 'ativa' | 'standby';
export type TipoInvestimento = 'renda_fixa' | 'renda_variavel' | 'fundo' | 'outro';
export type TipoNotificacao = 'saldo' | 'divida' | 'orcamento';
export type StatusNotificacao = 'enviado' | 'erro';
export type TipoMovimentacaoCofre = 'deposito' | 'retirada';

export type Familia = {
  id: string;
  nome: string;
  criado_em: string;
};

export type FamiliaMembro = {
  familia_id: string;
  user_id: string;
};

export type Perfil = {
  id: string;
  nome: string;
  telefone: string | null;
  familia_id: string | null;
  criado_em: string;
};

export type Conta = {
  id: string;
  user_id: string;
  nome: string;
  tipo: TipoConta;
  saldo_inicial: number;
  cor: string | null;
  ativa: boolean;
  criado_em: string;
};

export type Cartao = {
  id: string;
  user_id: string;
  nome: string;
  bandeira: string | null;
  limite: number;
  dia_fechamento: number;
  dia_vencimento: number;
  conta_pagamento_id: string | null;
  ativo: boolean;
  criado_em: string;
};

export type Categoria = {
  id: string;
  user_id: string;
  nome: string;
  tipo: TipoLancamento;
  cor: string | null;
  icone: string | null;
  criado_em: string;
};

export type Subcategoria = {
  id: string;
  categoria_id: string;
  user_id: string;
  nome: string;
  criado_em: string;
};

export type Transacao = {
  id: string;
  user_id: string;
  conta_id: string | null;
  cartao_id: string | null;
  categoria_id: string | null;
  subcategoria_id: string | null;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
  data_registro: string | null;
  data_vencimento: string | null;
  pago: boolean;
  eh_transferencia: boolean;
  grupo_transferencia: string | null;
  grupo_parcelamento: string | null;
  parcela_atual: number | null;
  parcela_total: number | null;
  pagamento_divida_id: string | null;
  divida_id: string | null;
  recorrente: boolean;
  frequencia: Frequencia | null;
  tipo_despesa: TipoDespesa | null;
  criado_em: string;
};

export type Orcamento = {
  id: string;
  user_id: string;
  categoria_id: string;
  subcategoria_id: string | null;
  valor_limite: number;
  mes_referencia: string;
  criado_em: string;
};

export type Divida = {
  id: string;
  user_id: string;
  descricao: string;
  credor: string | null;
  categoria_id: string | null;
  subcategoria_id: string | null;
  valor_total: number;
  valor_pago: number;
  parcelas_total: number | null;
  parcelas_pagas: number | null;
  data_vencimento: string | null;
  sem_vencimento: boolean;
  situacao: SituacaoDivida;
  observacoes: string | null;
  status: StatusDivida;
  criado_em: string;
  /* detalhes de negociação (migração 0026) */
  valor_original: number | null;
  valor_atual: number | null;
  tipo_divida: string | null;
  situacao_credito: string | null;
  desconto_pct: number | null;
  valor_com_desconto: number | null;
  taxa_juros_mensal: number | null;
  parcela_mensal: number | null;
};

export type PagamentoDivida = {
  id: string;
  divida_id: string;
  user_id: string;
  valor: number;
  data_pagamento: string;
  observacao: string | null;
  criado_em: string;
};

export type Meta = {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  valor_alvo: number;
  valor_atual: number;
  data_alvo: string | null;
  criado_em: string;
};

export type Cofre = {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  notas: string | null;
  cor: string | null;
  saldo: number;
  senha_hash: string | null;
  criado_em: string;
};

export type CofreMovimentacao = {
  id: string;
  cofre_id: string;
  user_id: string;
  tipo: TipoMovimentacaoCofre;
  valor: number;
  descricao: string | null;
  data: string;
  criado_em: string;
};

export type Investimento = {
  id: string;
  user_id: string;
  nome: string;
  tipo: TipoInvestimento | null;
  instituicao: string | null;
  valor_investido: number;
  valor_atual: number;
  data_aplicacao: string | null;
  criado_em: string;
};

export type AlertasConfig = {
  user_id: string;
  telefone: string | null;
  alerta_saldo_ativo: boolean;
  alerta_saldo_limite: number | null;
  alerta_divida_ativo: boolean;
  alerta_divida_dias_antes: number;
  alerta_orcamento_ativo: boolean;
  alerta_orcamento_percentual: number;
};

export type NotificacaoLog = {
  id: string;
  user_id: string;
  tipo: TipoNotificacao;
  mensagem: string;
  enviado_em: string;
  status: StatusNotificacao;
};

// ============================================
// ESTOQUE FAMILIAR (Reserva 180 dias)
// ============================================
export type TipoProdutoEstoque = 'alimento' | 'agua' | 'bebe' | 'higiene' | 'saude' | 'utilidade';
export type TipoMovEstoque = 'entrada' | 'reposicao' | 'consumo' | 'perda' | 'danificado' | 'descarte' | 'ajuste';
export type TipoSaidaEstoque = 'consumo' | 'perda' | 'danificado' | 'descarte';

export type EstoqueConfig = {
  familia_id: string;
  orc_min: number;
  orc_max: number;
  composicao: string | null;
  atualizado_em: string;
};

export type EstoqueLocal = {
  id: string;
  familia_id: string;
  nome: string;
  umidade: string;
  temperatura: string;
  sol: string;
  embalagem: string;
  inspecao: string | null;
  obs: string | null;
  criado_em: string;
};

export type EstoqueProduto = {
  id: string;
  familia_id: string;
  nome: string;
  categoria: string;
  tipo: TipoProdutoEstoque;
  unidade: string;
  meta: number;
  minimo: number;
  preco_ref: number;
  cap: number | null;
  local_id: string | null;
  obs: string | null;
  /** conteúdo da embalagem padrão (migração 0022) */
  emb_conteudo?: number | null;
  emb_unidade?: string | null;
  criado_em: string;
};

export type EstoqueLote = {
  id: string;
  familia_id: string;
  produto_id: string;
  qtd_inicial: number;
  qtd_atual: number;
  data_compra: string;
  data_fab: string | null;
  validade: string | null;
  num_lote: string | null;
  valor: number;
  fornecedor: string | null;
  local_id: string | null;
  cap: number | null;
  obs: string | null;
  saldo_negativo: boolean;
  /** conteúdo de cada embalagem desta compra (migração 0022) */
  emb_conteudo?: number | null;
  emb_unidade?: string | null;
  criado_em: string;
};

export type EstoqueMov = {
  id: string;
  familia_id: string;
  grupo: string;
  data: string;
  tipo: TipoMovEstoque;
  produto_id: string;
  lote_id: string | null;
  qtd: number;
  valor: number;
  obs: string | null;
  estornado: boolean;
  estornado_em: string | null;
  user_id: string | null;
  criado_em: string;
};

// ============================================
// LIFE · CASA (manutenções da casa)
// ============================================
export type UnidadeFrequencia = 'dias' | 'semanas' | 'meses' | 'anos';

export type CasaConfig = { familia_id: string; aviso_padrao: number; criado_em: string };

export type CasaPrestador = {
  id: string;
  familia_id: string;
  nome: string;
  servico: string | null;
  telefone: string | null;
  email: string | null;
  obs: string | null;
  criado_em: string;
};

export type CasaItem = {
  id: string;
  familia_id: string;
  nome: string;
  categoria: string;
  comodo: string | null;
  marca: string | null;
  modelo: string | null;
  data_instalacao: string | null;
  garantia_ate: string | null;
  valor: number;
  obs: string | null;
  criado_em: string;
};

export type CasaTarefa = {
  id: string;
  familia_id: string;
  item_id: string | null;
  titulo: string;
  categoria: string;
  freq_valor: number;
  freq_unidade: UnidadeFrequencia;
  ultima_execucao: string | null;
  proxima_data: string | null;
  aviso_dias: number;
  custo_estimado: number;
  prestador_id: string | null;
  instrucoes: string | null;
  ativa: boolean;
  criado_em: string;
};

export type CasaExecucao = {
  id: string;
  familia_id: string;
  tarefa_id: string;
  data: string;
  custo: number;
  prestador_id: string | null;
  obs: string | null;
  ultima_anterior: string | null;
  proxima_anterior: string | null;
  user_id: string | null;
  criado_em: string;
};

export type EstoqueListaItem = {
  id: string;
  familia_id: string;
  produto_id: string | null;
  nome: string | null;
  obs: string | null;
  user_id: string | null;
  criado_em: string;
};

/* ---------- Mentor de Vida (privado por usuário) ---------- */
export type VidaContexto = {
  user_id: string;
  texto: string;
  atualizado_em: string;
};

export type VidaConversa = {
  id: string;
  user_id: string;
  titulo: string;
  pilar: number | null;
  criado_em: string;
  atualizado_em: string;
};

export type VidaMensagem = {
  id: string;
  conversa_id: string;
  user_id: string;
  papel: 'user' | 'assistant';
  conteudo: string;
  criado_em: string;
};

export type VidaAvaliacao = {
  id: string;
  user_id: string;
  mes: string;
  pilar: number;
  nota: number | null;
  situacao: string | null;
  problema: string | null;
  objetivo: string | null;
  proxima_acao: string | null;
  indicador: string | null;
  origem: 'manual' | 'ia';
  atualizado_em: string;
};

export type VidaPlano = {
  id: string;
  user_id: string;
  pilar: number | null;
  titulo: string;
  objetivo: string | null;
  resumo: string | null;
  prazo: string | null;
  status: 'ativo' | 'pausado' | 'concluido';
  origem: 'manual' | 'ia' | 'dividas';
  criado_em: string;
  atualizado_em: string;
};

export type VidaEtapa = {
  id: string;
  plano_id: string;
  user_id: string;
  ordem: number;
  titulo: string;
  detalhe: string | null;
  prazo: string | null;
  feita: boolean;
  feita_em: string | null;
};

export type FonteIndicador = 'manual' | 'dividas_restante' | 'sobra_mes' | 'cofre_saldo';

export type VidaIndicador = {
  id: string;
  plano_id: string;
  user_id: string;
  nome: string;
  unidade: string;
  meta: number | null;
  inicial: number | null;
  direcao: 'subir' | 'descer';
  fonte: FonteIndicador;
  ordem: number;
};

export type VidaRegistro = {
  id: string;
  indicador_id: string;
  user_id: string;
  data: string;
  valor: number;
};

export type VidaDividaParams = {
  divida_id: string;
  user_id: string;
  taxa_mensal: number | null;
  parcela: number | null;
  atualizado_em: string;
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDef<Row, Relationships extends Relationship[] = []> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: Relationships;
};

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      familias: TableDef<Familia>;
      familia_membros: TableDef<
        FamiliaMembro,
        [
          {
            foreignKeyName: 'familia_membros_familia_id_fkey';
            columns: ['familia_id'];
            isOneToOne: false;
            referencedRelation: 'familias';
            referencedColumns: ['id'];
          },
        ]
      >;
      perfis: TableDef<
        Perfil,
        [
          {
            foreignKeyName: 'perfis_familia_id_fkey';
            columns: ['familia_id'];
            isOneToOne: false;
            referencedRelation: 'familias';
            referencedColumns: ['id'];
          },
        ]
      >;
      contas: TableDef<Conta>;
      cartoes: TableDef<
        Cartao,
        [
          {
            foreignKeyName: 'cartoes_conta_pagamento_id_fkey';
            columns: ['conta_pagamento_id'];
            isOneToOne: false;
            referencedRelation: 'contas';
            referencedColumns: ['id'];
          },
        ]
      >;
      categorias: TableDef<Categoria>;
      subcategorias: TableDef<
        Subcategoria,
        [
          {
            foreignKeyName: 'subcategorias_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias';
            referencedColumns: ['id'];
          },
        ]
      >;
      transacoes: TableDef<
        Transacao,
        [
          {
            foreignKeyName: 'transacoes_conta_id_fkey';
            columns: ['conta_id'];
            isOneToOne: false;
            referencedRelation: 'contas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transacoes_cartao_id_fkey';
            columns: ['cartao_id'];
            isOneToOne: false;
            referencedRelation: 'cartoes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transacoes_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transacoes_subcategoria_id_fkey';
            columns: ['subcategoria_id'];
            isOneToOne: false;
            referencedRelation: 'subcategorias';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transacoes_pagamento_divida_id_fkey';
            columns: ['pagamento_divida_id'];
            isOneToOne: false;
            referencedRelation: 'pagamentos_dividas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transacoes_divida_id_fkey';
            columns: ['divida_id'];
            isOneToOne: false;
            referencedRelation: 'dividas';
            referencedColumns: ['id'];
          },
        ]
      >;
      orcamentos: TableDef<
        Orcamento,
        [
          {
            foreignKeyName: 'orcamentos_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orcamentos_subcategoria_id_fkey';
            columns: ['subcategoria_id'];
            isOneToOne: false;
            referencedRelation: 'subcategorias';
            referencedColumns: ['id'];
          },
        ]
      >;
      dividas: TableDef<
        Divida,
        [
          {
            foreignKeyName: 'dividas_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dividas_subcategoria_id_fkey';
            columns: ['subcategoria_id'];
            isOneToOne: false;
            referencedRelation: 'subcategorias';
            referencedColumns: ['id'];
          },
        ]
      >;
      pagamentos_dividas: TableDef<
        PagamentoDivida,
        [
          {
            foreignKeyName: 'pagamentos_dividas_divida_id_fkey';
            columns: ['divida_id'];
            isOneToOne: false;
            referencedRelation: 'dividas';
            referencedColumns: ['id'];
          },
        ]
      >;
      metas: TableDef<Meta>;
      cofres: TableDef<Cofre>;
      cofre_movimentacoes: TableDef<
        CofreMovimentacao,
        [
          {
            foreignKeyName: 'cofre_movimentacoes_cofre_id_fkey';
            columns: ['cofre_id'];
            isOneToOne: false;
            referencedRelation: 'cofres';
            referencedColumns: ['id'];
          },
        ]
      >;
      investimentos: TableDef<Investimento>;
      alertas_config: TableDef<AlertasConfig>;
      notificacoes_log: TableDef<NotificacaoLog>;
      estoque_config: TableDef<EstoqueConfig>;
      estoque_locais: TableDef<EstoqueLocal>;
      estoque_produtos: TableDef<EstoqueProduto>;
      estoque_lotes: TableDef<EstoqueLote>;
      estoque_movs: TableDef<EstoqueMov>;
      estoque_lista: TableDef<EstoqueListaItem>;
      casa_config: TableDef<CasaConfig>;
      casa_prestadores: TableDef<CasaPrestador>;
      casa_itens: TableDef<CasaItem>;
      casa_tarefas: TableDef<CasaTarefa>;
      casa_execucoes: TableDef<CasaExecucao>;
      vida_contexto: TableDef<VidaContexto>;
      vida_conversas: TableDef<VidaConversa>;
      vida_mensagens: TableDef<VidaMensagem>;
      vida_avaliacoes: TableDef<VidaAvaliacao>;
      vida_planos: TableDef<VidaPlano>;
      vida_etapas: TableDef<VidaEtapa>;
      vida_indicadores: TableDef<VidaIndicador>;
      vida_registros: TableDef<VidaRegistro>;
      vida_dividas_params: TableDef<VidaDividaParams>;
    };
    Views: Record<string, never>;
    Functions: {
      estoque_inicializar: { Args: Record<string, never>; Returns: boolean };
      estoque_entrada: {
        Args: {
          p_produto: string;
          p_qtd: number;
          p_data_compra: string;
          p_validade?: string | null;
          p_data_fab?: string | null;
          p_num_lote?: string | null;
          p_valor?: number;
          p_fornecedor?: string | null;
          p_local?: string | null;
          p_cap?: number | null;
          p_obs?: string | null;
          p_tipo?: 'entrada' | 'reposicao';
          p_emb_conteudo?: number | null;
          p_emb_unidade?: string | null;
        };
        Returns: string;
      };
      estoque_saida: {
        Args: {
          p_produto: string;
          p_qtd: number;
          p_tipo: TipoSaidaEstoque;
          p_data?: string;
          p_obs?: string | null;
          p_lote?: string | null;
          p_permitir_negativo?: boolean;
        };
        Returns: { grupo: string; falta: number };
      };
      estoque_estornar: { Args: { p_mov: string }; Returns: undefined };
      estoque_atualizar_lote: {
        Args: {
          p_lote: string;
          p_contagem: number;
          p_data_compra: string;
          p_validade?: string | null;
          p_data_fab?: string | null;
          p_num_lote?: string | null;
          p_valor?: number;
          p_fornecedor?: string | null;
          p_local?: string | null;
          p_obs?: string | null;
        };
        Returns: undefined;
      };
      casa_inicializar: { Args: Record<string, never>; Returns: boolean };
      casa_registrar_execucao: {
        Args: {
          p_tarefa: string;
          p_data: string;
          p_custo?: number;
          p_prestador?: string | null;
          p_obs?: string | null;
          p_proxima?: string | null;
        };
        Returns: string;
      };
      casa_desfazer_execucao: { Args: { p_exec: string }; Returns: undefined };
      estoque_importar_backup: { Args: { p_dados: unknown }; Returns: { produtos: number; lotes: number; movs: number } };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
