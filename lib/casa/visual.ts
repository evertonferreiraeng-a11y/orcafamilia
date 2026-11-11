// Detalhes visuais do app Casa (ícones de categoria e ciclo das manutenções).
import { diasAte, hojeISO } from '@/lib/estoque/calc';
import type { CasaTarefa } from '@/types/database';

const EMOJI_CASA: [RegExp, string][] = [
  [/[áa]gua|filtro|caixa d/i, '💧'],
  [/climatiza|ar[- ]condicionado|ventila/i, '❄️'],
  [/hidr[áa]ulica|encanamento|esgoto/i, '🚰'],
  [/el[ée]trica|energia|disjuntor/i, '⚡'],
  [/eletrodom/i, '🔌'],
  [/telhado|calha/i, '🏠'],
  [/praga|dedetiza|cupim/i, '🐜'],
  [/(^|\s)g[áa]s\b/i, '🔥'],
  [/jardim|externa|piscina/i, '🌿'],
  [/seguran[çc]a|alarme|c[âa]mera|extintor/i, '🔒'],
  [/pintura|estrutura|reforma/i, '🎨'],
  [/limpeza/i, '🧽'],
];

export function emojiCasa(categoria: string): string {
  for (const [re, e] of EMOJI_CASA) if (re.test(categoria)) return e;
  return '🛠️';
}

/** Quanto do intervalo entre a última vez e a próxima data já passou (0–100). */
export function cicloTarefa(t: CasaTarefa, hoje = hojeISO()): number | null {
  const falta = diasAte(t.proxima_data, hoje);
  if (falta === null) return null;
  if (falta <= 0) return 100;
  const desde = diasAte(t.ultima_execucao, hoje);
  if (desde === null) return null;
  const total = falta - desde; // desde é negativo (passado)
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, (-desde / total) * 100));
}
