export type TipoConta = 'corrente' | 'poupanca' | 'investimento' | 'dinheiro';
export type TipoLancamento = 'receita' | 'despesa';
export type Frequencia = 'mensal' | 'semanal';
export type StatusDivida = 'ativa' | 'quitada';
export type TipoInvestimento = 'renda_fixa' | 'renda_variavel' | 'fundo' | 'outro';
export type TipoNotificacao = 'saldo' | 'divida' | 'orcamento';
export type StatusNotificacao = 'enviado' | 'erro';

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
  pago: boolean;
  eh_transferencia: boolean;
  grupo_transferencia: string | null;
  grupo_parcelamento: string | null;
  parcela_atual: number | null;
  parcela_total: number | null;
  recorrente: boolean;
  frequencia: Frequencia | null;
  criado_em: string;
};

export type Orcamento = {
  id: string;
  user_id: string;
  categoria_id: string;
  valor_limite: number;
  mes_referencia: string;
  criado_em: string;
};

export type Divida = {
  id: string;
  user_id: string;
  descricao: string;
  credor: string | null;
  valor_total: number;
  valor_pago: number;
  parcelas_total: number | null;
  parcelas_pagas: number | null;
  data_vencimento: string;
  status: StatusDivida;
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
        ]
      >;
      dividas: TableDef<Divida>;
      metas: TableDef<Meta>;
      investimentos: TableDef<Investimento>;
      alertas_config: TableDef<AlertasConfig>;
      notificacoes_log: TableDef<NotificacaoLog>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
