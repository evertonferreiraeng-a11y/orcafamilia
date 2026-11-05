import { Suspense } from 'react';
import { BebeEstoque } from '@/components/estoque/AguaBebeLocais';

export const metadata = { title: 'Alimentação do bebê – Estoque Familiar' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BebeEstoque />
    </Suspense>
  );
}
