/**
 * Emoji de uma categoria/subcategoria: usa o ícone cadastrado (coluna `icone`)
 * e, se não houver, escolhe um pelo nome. Ordem importa: o primeiro termo que
 * casar vence.
 */
const REGRAS: [RegExp, string][] = [
  [/sal[aá]rio|holerite|pagamento/i, '💼'],
  [/receita|renda|freela|extra|b[oô]nus|13|f[eé]rias/i, '💰'],
  [/invest|poupan|reserva|\ba[cç][oõ]es\b|tesouro|cdb/i, '📈'],
  [/d[ií]vida|acordo|empr[eé]stimo|financiamento|consignado/i, '🧾'],
  [/cart[aã]o/i, '💳'],
  [/moradia|casa|aluguel|condom[ií]nio|iptu|lar\b/i, '🏠'],
  [/energia|luz|el[eé]tric/i, '💡'],
  [/[aá]gua|saneamento/i, '🚿'],
  [/g[aá]s\b/i, '🔥'],
  [/internet|wi-?fi|telefone|celular/i, '📶'],
  [/mercado|supermercado|feira|a[cç]ougue|hortifruti/i, '🛒'],
  [/aliment|comida|refei[cç]|restaurante|lanche|delivery|ifood/i, '🍽️'],
  [/padaria|caf[eé]/i, '☕'],
  [/combust[ií]vel|gasolina|etanol|posto/i, '⛽'],
  [/transporte|carro|ve[ií]culo|uber|[oô]nibus|metr[oô]|ped[aá]gio|estaciona/i, '🚗'],
  [/manuten[cç]/i, '🔧'],
  [/sa[uú]de|m[eé]dic|consulta|exame|plano de sa[uú]de/i, '🩺'],
  [/farm[aá]cia|rem[eé]dio/i, '💊'],
  [/academia|esporte|treino/i, '🏋️'],
  [/cuidados|beleza|cabel|barbe|est[eé]tica|higiene/i, '💅'],
  [/filho|jo[aã]o|crian[cç]a|beb[eê]|fralda/i, '🧒'],
  [/escola|educa|curso|faculdade|livro|material/i, '📚'],
  [/lazer|divers|passeio|cinema|streaming|netflix|viagem/i, '🎉'],
  [/viagem|hotel|passagem/i, '✈️'],
  [/presente|doa[cç]|d[ií]zimo|oferta|caridade/i, '🎁'],
  [/pet|cachorro|gato|ra[cç][aã]o|veterin/i, '🐾'],
  [/roupa|vestu[aá]rio|cal[cç]ado/i, '👕'],
  [/imposto|taxa|tarifa|banco/i, '🏛️'],
  [/seguro/i, '🛡️'],
  [/outr/i, '📦'],
];

export function emojiCategoria(nome: string, icone?: string | null): string {
  if (icone && icone.trim()) return icone.trim();
  for (const [re, emoji] of REGRAS) if (re.test(nome)) return emoji;
  return '🏷️';
}

/** "Humor" do card conforme o andamento do orçamento. */
export function humorOrcamento(opts: { orcado: number; exec: number; receita?: boolean; adiantado?: boolean }): { emoji: string; dica: string } {
  const { orcado, exec, receita, adiantado } = opts;
  if (orcado <= 0) return exec > 0 ? { emoji: '🤔', dica: 'Tem gasto mas nenhum orçamento' } : { emoji: '✍️', dica: 'Falta planejar' };
  const pct = (exec / orcado) * 100;
  if (receita) return pct >= 100 ? { emoji: '🤑', dica: 'Receita prevista atingida' } : exec > 0 ? { emoji: '⏳', dica: 'Recebendo' } : { emoji: '🗓️', dica: 'Aguardando' };
  if (pct > 100) return { emoji: '🔥', dica: 'Estourou o orçado' };
  if (pct >= 100) return { emoji: '🎯', dica: 'Exatamente no limite' };
  if (adiantado || pct >= 80) return { emoji: '😬', dica: 'Perto do limite' };
  if (exec === 0) return { emoji: '😴', dica: 'Nada gasto ainda' };
  return { emoji: '😌', dica: 'Tranquilo, dentro do orçado' };
}
