export type TipoConta = 'corrente' | 'poupanca' | 'investimento' | 'dinheiro';
export type TipoLancamento = 'receita' | 'despesa';
export type Frequencia = 'mensal' | 'semanal';
export type StatusDivida = 'ativa' | 'quitada';
export type TipoInvestimento = 'renda_fixa' | 'renda_variavel' | 'fundo' | 'outro';
export type TipoNotificacao = 'saldo' | 'divida' | 'orcamento';
export type StatusNotificacao = 'enviado' | 'erro';

export interface Familia {
  id: string;
  nome: string;
  criado_em: string;
}

export interface FamiliaMembro {
  familia_id: string;
  user_id: string;
}

export interface Perfil {
  id: string;
  nome: string;
  telefone: string | null;
  familia_id: string | null;
  criado_em: string;
}

export interface Conta {
  id: string;
  user_id: string;
  nome: string;
  tipo: TipoConta;
  saldo_inicial: number;
  cor: string | null;
  ativa: boolean;
  criado_em: string;
}

export interface Cartao {
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
}

export interface Categoria {
  id: string;
  user_id: string;
  nome: string;
  tipo: TipoLancamento;
  cor: string | null;
  icone: string | null;
  criado_em: string;
}

export interface Transacao {
  id: string;
  user_id: string;
  conta_id: string | null;
  cartao_id: string | null;
  categoria_id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
  recorrente: boolean;
  frequencia: Frequencia | null;
  criado_em: string;
}

export interface Orcamento {
  id: string;
  user_id: string;
  categoria_id: string;
  valor_limite: number;
  mes_referencia: string;
  criado_em: string;
}

export interface Divida {
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
}

export interface Meta {
  id: string;
  user_id: string;
  nome: string;
  valor_alvo: number;
  valor_atual: number;
  data_alvo: string | null;
  criado_em: string;
}

export interface Investimento {
  id: string;
  user_id: string;
  nome: string;
  tipo: TipoInvestimento | null;
  instituicao: string | null;
  valor_investido: number;
  valor_atual: number;
  data_aplicacao: string | null;
  criado_em: string;
}

export interface AlertasConfig {
  user_id: string;
  telefone: string | null;
  alerta_saldo_ativo: boolean;
  alerta_saldo_limite: number | null;
  alerta_divida_ativo: boolean;
  alerta_divida_dias_antes: number;
  alerta_orcamento_ativo: boolean;
  alerta_orcamento_percentual: number;
}

export interface NotificacaoLog {
  id: string;
  user_id: string;
  tipo: TipoNotificacao;
  mensagem: string;
  enviado_em: string;
  status: StatusNotificacao;
}

export interface Database {
  public: {
    Tables: {
      familias: { Row: Familia; Insert: Partial<Familia>; Update: Partial<Familia> };
      familia_membros: { Row: FamiliaMembro; Insert: Partial<FamiliaMembro>; Update: Partial<FamiliaMembro> };
      perfis: { Row: Perfil; Insert: Partial<Perfil>; Update: Partial<Perfil> };
      contas: { Row: Conta; Insert: Partial<Conta>; Update: Partial<Conta> };
      cartoes: { Row: Cartao; Insert: Partial<Cartao>; Update: Partial<Cartao> };
      categorias: { Row: Categoria; Insert: Partial<Categoria>; Update: Partial<Categoria> };
      transacoes: { Row: Transacao; Insert: Partial<Transacao>; Update: Partial<Transacao> };
      orcamentos: { Row: Orcamento; Insert: Partial<Orcamento>; Update: Partial<Orcamento> };
      dividas: { Row: Divida; Insert: Partial<Divida>; Update: Partial<Divida> };
      metas: { Row: Meta; Insert: Partial<Meta>; Update: Partial<Meta> };
      investimentos: { Row: Investimento; Insert: Partial<Investimento>; Update: Partial<Investimento> };
      alertas_config: { Row: AlertasConfig; Insert: Partial<AlertasConfig>; Update: Partial<AlertasConfig> };
      notificacoes_log: { Row: NotificacaoLog; Insert: Partial<NotificacaoLog>; Update: Partial<NotificacaoLog> };
    };
  };
}
