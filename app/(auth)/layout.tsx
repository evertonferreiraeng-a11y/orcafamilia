export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-600">OrçaFamília</h1>
          <p className="mt-1 text-sm text-gray-500">Controle financeiro do casal, em um só lugar</p>
        </div>
        <div className="card p-8">{children}</div>
      </div>
    </div>
  );
}
