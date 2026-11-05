import { Suspense } from 'react';
import { ProdutosEstoque } from '@/components/estoque/ProdutosEstoque';

export const metadata = { title: 'Controle de estoque – Estoque Familiar' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProdutosEstoque />
    </Suspense>
  );
}
