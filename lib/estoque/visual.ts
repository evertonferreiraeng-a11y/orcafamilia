// Detalhes visuais do Estoque (ícones de categoria e tons).

const EMOJI_CATEGORIA: [RegExp, string][] = [
  [/gr[ãa]o|cereal|arroz|feij/i, '🌾'],
  [/massa|macarr/i, '🍝'],
  [/farinha|fub/i, '🥖'],
  [/b[áa]sico|a[çc]úcar|sal\b/i, '🧂'],
  [/[óo]leo|azeite/i, '🫒'],
  [/latic|leite|queijo/i, '🥛'],
  [/oleagin|amendoim|castanha|nozes/i, '🥜'],
  [/prote[íi]na|sardinha|atum|carne|ovo/i, '🐟'],
  [/molho|conserva|enlatad/i, '🥫'],
  [/[áa]gua/i, '💧'],
  [/beb[êe]|infantil|f[óo]rmula/i, '🍼'],
  [/higiene|limpeza|papel/i, '🧻'],
  [/sa[úu]de|socorro|rem[ée]dio|m[ée]dic/i, '🩹'],
  [/utilidade|emerg[êe]ncia|lanterna|pilha|vela/i, '🔦'],
  [/bebida|caf[ée]|ch[áa]/i, '☕'],
  [/doce|chocolate|biscoito/i, '🍪'],
  [/tempero|condimento/i, '🌶️'],
];

export function emojiCategoria(categoria: string): string {
  for (const [re, e] of EMOJI_CATEGORIA) if (re.test(categoria)) return e;
  return '📦';
}
