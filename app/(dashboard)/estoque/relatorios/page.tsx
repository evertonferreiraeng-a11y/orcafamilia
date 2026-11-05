import { Suspense } from 'react';
import { RelatoriosEstoque } from '@/components/estoque/RelatoriosConfig';

export const metadata = { title: 'Relatórios – Estoque Familiar' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RelatoriosEstoque />
    </Suspense>
  );
}
