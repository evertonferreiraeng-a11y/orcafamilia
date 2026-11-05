import { Suspense } from 'react';
import { ComprasEstoque } from '@/components/estoque/ComprasEstoque';

export const metadata = { title: 'Lista de compras – Estoque Familiar' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ComprasEstoque />
    </Suspense>
  );
}
