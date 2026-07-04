export function formatCurrency(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(`${data}T00:00:00`) : data;
  return d.toLocaleDateString('pt-BR');
}

export function primeiroDiaMes(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-01`;
}

export function nomeMes(data: Date): string {
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function ultimoDiaMes(data: Date): string {
  const ultimo = new Date(data.getFullYear(), data.getMonth() + 1, 0);
  return `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`;
}

export function addMeses(data: Date, meses: number): Date {
  return new Date(data.getFullYear(), data.getMonth() + meses, 1);
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function calcularVariacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export function formatPercent(valor: number): string {
  return `${valor >= 0 ? '+' : ''}${valor.toFixed(1)}%`;
}

export function parseMesParam(mesParam?: string): Date {
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [ano, mes] = mesParam.split('-').map(Number);
    return new Date(ano, mes - 1, 1);
  }
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
}
