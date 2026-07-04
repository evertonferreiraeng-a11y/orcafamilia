import { cn, formatCurrency, formatDate } from '@/lib/utils';

export interface AtividadeRecente {
  id: string;
  descricao: string;
  categoria: string;
  cor: string | null;
  tipo: 'receita' | 'despesa';
  valor: number;
  data: string;
}

export function RecentActivityList({ atividades }: { atividades: AtividadeRecente[] }) {
  if (atividades.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Nenhuma transação neste período.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="py-2 font-medium">Descrição</th>
            <th className="py-2 font-medium">Categoria</th>
            <th className="py-2 font-medium">Data</th>
            <th className="py-2 text-right font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {atividades.map((a) => (
            <tr key={a.id} className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/60">
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ backgroundColor: `${a.cor ?? '#888888'}1a`, color: a.cor ?? '#888888' }}
                  >
                    {a.categoria.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium text-gray-800">{a.descricao}</span>
                </div>
              </td>
              <td className="py-3">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {a.categoria}
                </span>
              </td>
              <td className="py-3 text-gray-500">{formatDate(a.data)}</td>
              <td className="py-3 text-right">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                    a.tipo === 'receita' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
                  )}
                >
                  {a.tipo === 'receita' ? '+' : '−'} {formatCurrency(Math.abs(a.valor))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
