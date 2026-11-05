import { Suspense } from 'react';
import { LocaisEstoque } from '@/components/estoque/AguaBebeLocais';

export const metadata = { title: 'Locais de armazenamento – Estoque Familiar' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LocaisEstoque />
    </Suspense>
  );
}
