export const TEMA_STORAGE_KEY = 'orcafamilia:tema';

export interface TemaOpcao {
  chave: string;
  nome: string;
  cor: string;
}

export const TEMAS: TemaOpcao[] = [
  { chave: 'azul', nome: 'Azul', cor: '#2a78d6' },
  { chave: 'verde', nome: 'Verde', cor: '#059669' },
  { chave: 'roxo', nome: 'Roxo', cor: '#7c3aed' },
  { chave: 'grafite', nome: 'Grafite', cor: '#334155' },
  { chave: 'laranja', nome: 'Laranja', cor: '#ea580c' },
  { chave: 'vermelho', nome: 'Vermelho', cor: '#dc2626' },
  { chave: 'rosa', nome: 'Rosa', cor: '#db2777' },
  { chave: 'amarelo', nome: 'Amarelo', cor: '#d97706' },
  { chave: 'ciano', nome: 'Ciano', cor: '#0891b2' },
  { chave: 'marrom', nome: 'Marrom', cor: '#6f4a29' },
];

export const TEMA_INIT_SCRIPT = `try{var t=localStorage.getItem('${TEMA_STORAGE_KEY}');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`;
