import { Suspense } from 'react';
import { AguaEstoque } from '@/components/estoque/AguaBebeLocais';

export const metadata = { title: 'Água potável – Estoque Familiar' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AguaEstoque />
    </Suspense>
  );
}
