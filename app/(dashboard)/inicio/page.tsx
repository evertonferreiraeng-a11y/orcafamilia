import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase-server';
import { carregarEstoque } from '@/lib/estoque/carregar';
import { alertaLote, estoqueAtual, fmtPct, fmtQtd, itensParaComprar, percentualReserva, soma, type DadosEstoque } from '@/lib/estoque/calc';
import { IconEstoque, IconWallet, IconChevronRight } from '@/components/icons';

export const metadata = { title: 'Início – Apps da família' };
export const dynamic = 'force-dynamic';

function Atalho({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-700">
      {children}
    </Link>
  );
}

export default async function InicioPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase.from('perfis').select('nome').eq('id', user.id).maybeSingle();
  let estoque: DadosEstoque | null = null;
  try {
    estoque = await carregarEstoque(supabase);
  } catch {
    estoque = null; // migração ainda não aplicada: o card mostra só o atalho
  }

  const resumoEstoque = estoque
    ? (() => {
        const ativos = estoque.lotes.filter((l) => l.qtd_atual > 0);
        const aguas = estoque.produtos.filter((p) => p.tipo === 'agua');
        return {
          reserva: percentualReserva(estoque, ['alimento', 'agua']),
          vencendo: ativos.filter((l) => ['venc', 'd30'].includes(alertaLote(l))).length,
          comprar: itensParaComprar(estoque).length,
          litros: soma(aguas, (p) => estoqueAtual(estoque!, p)),
        };
      })()
    : null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <p className="text-sm text-gray-500">Olá, {(perfil?.nome || 'família').split(' ')[0]} 👋</p>
        <h2 className="text-2xl font-bold text-gray-900">Apps da família</h2>
        <p className="mt-1 text-sm text-gray-500">Escolha um app. O login, a família e os dados são compartilhados entre todos.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <IconWallet className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Orçamento Familiar</h3>
              <p className="text-sm text-gray-500">Contas, cartões, transações, orçamentos, dívidas e metas</p>
            </div>
          </div>
          <div className="mb-5 flex flex-wrap gap-1.5">
            <Atalho href="/transacoes">Transações</Atalho>
            <Atalho href="/orcamentos">Orçamentos</Atalho>
            <Atalho href="/dividas">Dívidas</Atalho>
            <Atalho href="/metas">Metas</Atalho>
            <Atalho href="/cofre">Cofre</Atalho>
          </div>
          <Link href="/dashboard" className="btn-primary mt-auto self-start">
            Abrir Orçamento <IconChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <IconEstoque className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gestão de Estoque Familiar</h3>
              <p className="text-sm text-gray-500">Reserva de 180 dias: alimentos, água e itens do bebê</p>
            </div>
          </div>
          {resumoEstoque ? (
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-emerald-50 px-3 py-2">
                <p className="text-xs text-emerald-700">Reserva concluída</p>
                <p className="text-lg font-bold text-emerald-800">{fmtPct(resumoEstoque.reserva)}</p>
              </div>
              <div className="rounded-xl bg-brand-50 px-3 py-2">
                <p className="text-xs text-brand-700">Água armazenada</p>
                <p className="text-lg font-bold text-brand-800">{fmtQtd(resumoEstoque.litros)} L</p>
              </div>
              <div className={`rounded-xl px-3 py-2 ${resumoEstoque.vencendo ? 'bg-red-50' : 'bg-gray-50'}`}>
                <p className={`text-xs ${resumoEstoque.vencendo ? 'text-red-700' : 'text-gray-500'}`}>Vencidos / até 30 dias</p>
                <p className={`text-lg font-bold ${resumoEstoque.vencendo ? 'text-red-800' : 'text-gray-800'}`}>{resumoEstoque.vencendo} lote(s)</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-700">Para comprar</p>
                <p className="text-lg font-bold text-amber-800">{resumoEstoque.comprar} produto(s)</p>
              </div>
            </div>
          ) : (
            <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">Módulo ainda não configurado no banco (migração 0019).</p>
          )}
          <div className="mb-5 flex flex-wrap gap-1.5">
            <Atalho href="/estoque/compras">Lista de compras</Atalho>
            <Atalho href="/estoque/lotes">Validades</Atalho>
            <Atalho href="/estoque/agua">Água</Atalho>
            <Atalho href="/estoque/bebe">Bebê</Atalho>
          </div>
          <Link href="/estoque" className="mt-auto inline-flex items-center justify-center gap-2 self-start rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
            Abrir Estoque <IconChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
