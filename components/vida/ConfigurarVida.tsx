import Link from 'next/link';

/** Passo a passo quando falta a migração ou a chave da API. */
export function ConfigurarVida({ faltaBanco, faltaChave, migracao = '0024_vida.sql' }: { faltaBanco: boolean; faltaChave: boolean; migracao?: string }) {
  return (
    <div className="card space-y-4 p-6">
      <div className="flex items-center gap-3">
        <span className="text-4xl">🧭</span>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Configurar o Mentor de Vida</h1>
          <p className="text-sm text-gray-500">Faltam {faltaBanco && faltaChave ? 'dois passos' : 'um passo'} para começar.</p>
        </div>
      </div>
      <ol className="space-y-3 text-sm text-gray-700">
        {faltaBanco && (
          <li className="rounded-2xl bg-gray-50 p-4">
            <p className="font-semibold text-gray-900">1. Criar as tabelas no Supabase</p>
            <p className="mt-1">
              No painel do Supabase, abra <b>SQL Editor</b>, cole o conteúdo do arquivo <code className="rounded bg-white px-1">supabase/migrations/{migracao}</code> do repositório e
              clique em <b>Run</b>. As tabelas são privadas: só o seu login enxerga.
            </p>
          </li>
        )}
        {faltaChave && (
          <li className="rounded-2xl bg-gray-50 p-4">
            <p className="font-semibold text-gray-900">{faltaBanco ? '2' : '1'}. Ligar a IA</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>
                Crie uma chave em <b>console.anthropic.com</b> → API Keys (e adicione créditos em Billing; o uso é cobrado por conversa, normalmente centavos).
              </li>
              <li>
                Na Vercel, projeto <b>orcafamilia</b> → Settings → Environment Variables → adicione <code className="rounded bg-white px-1">ANTHROPIC_API_KEY</code> com a chave.
              </li>
              <li>Faça um novo deploy (Deployments → ⋯ → Redeploy) para a variável valer.</li>
            </ol>
          </li>
        )}
      </ol>
      {!faltaBanco && (
        <Link href="/vida" className="inline-block text-sm font-semibold text-violet-600 hover:underline">
          Voltar ao painel →
        </Link>
      )}
    </div>
  );
}
