import { Suspense } from 'react';
import { LotesEstoque } from '@/components/estoque/LotesEstoque';

export const metadata = { title: 'Validade e lotes – Estoque Familiar' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LotesEstoque />
    </Suspense>
  );
}
