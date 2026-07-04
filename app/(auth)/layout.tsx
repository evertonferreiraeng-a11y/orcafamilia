import { IconWallet } from '@/components/icons';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const ano = new Date().getFullYear();

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="hidden w-1/2 flex-col justify-between bg-brand-600 p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <IconWallet className="h-5 w-5" />
          </span>
          <span className="text-base font-bold">OrçaFamília</span>
        </div>

        <div>
          <h2 className="text-2xl font-bold leading-tight">Controle financeiro do casal, em um só lugar.</h2>
          <p className="mt-4 max-w-sm text-white/70">
            Contas, cartões, orçamentos e metas organizados para vocês dois tomarem decisões financeiras juntos.
          </p>
        </div>

        <p className="text-sm text-white/50">© {ano} OrçaFamília</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <div className="mb-3 inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
                <IconWallet className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold text-gray-900">OrçaFamília</span>
            </div>
            <p className="text-sm text-gray-500">Controle financeiro do casal, em um só lugar</p>
          </div>
          <div className="card p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
