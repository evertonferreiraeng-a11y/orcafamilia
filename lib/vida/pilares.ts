/** Os 10 pilares do Mentor de Vida (ordem e números fixos — usados no banco). */
export const PILARES = [
  { n: 1, nome: 'Saúde física', curto: 'Saúde física', emoji: '💪', cor: '#16a34a' },
  { n: 2, nome: 'Saúde mental e emocional', curto: 'Mente', emoji: '🧠', cor: '#8b5cf6' },
  { n: 3, nome: 'Família e casamento', curto: 'Família', emoji: '👨‍👩‍👦', cor: '#ec4899' },
  { n: 4, nome: 'Carreira e desenvolvimento profissional', curto: 'Carreira', emoji: '💼', cor: '#2563eb' },
  { n: 5, nome: 'Finanças pessoais', curto: 'Finanças', emoji: '💰', cor: '#ca8a04' },
  { n: 6, nome: 'Empreendedorismo e renda extra', curto: 'Renda extra', emoji: '🚀', cor: '#ea580c' },
  { n: 7, nome: 'Educação e conhecimento', curto: 'Educação', emoji: '📚', cor: '#0891b2' },
  { n: 8, nome: 'Espiritualidade e fé', curto: 'Fé', emoji: '🙏', cor: '#7c3aed' },
  { n: 9, nome: 'Disciplina, hábitos e organização', curto: 'Disciplina', emoji: '🗓️', cor: '#475569' },
  { n: 10, nome: 'Patrimônio, segurança e futuro', curto: 'Futuro', emoji: '🛡️', cor: '#0f766e' },
] as const;

export type NumeroPilar = (typeof PILARES)[number]['n'];

export const pilarPorNumero = (n: number | null | undefined) => PILARES.find((p) => p.n === n) ?? null;

/** Cor da nota (0–10). */
export function corNota(nota: number | null | undefined): { texto: string; fundo: string; barra: string } {
  if (nota == null) return { texto: 'text-gray-400', fundo: 'bg-gray-50', barra: 'bg-gray-200' };
  if (nota >= 8) return { texto: 'text-emerald-700', fundo: 'bg-emerald-50', barra: 'bg-emerald-500' };
  if (nota >= 6) return { texto: 'text-lime-700', fundo: 'bg-lime-50', barra: 'bg-lime-500' };
  if (nota >= 4) return { texto: 'text-amber-700', fundo: 'bg-amber-50', barra: 'bg-amber-400' };
  return { texto: 'text-red-700', fundo: 'bg-red-50', barra: 'bg-red-500' };
}

/** Primeiro dia do mês em yyyy-MM-dd. */
export function mesRef(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
