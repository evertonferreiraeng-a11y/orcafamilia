import { Suspense } from 'react';
import { PainelEstoque } from '@/components/estoque/PainelEstoque';

export const metadata = { title: 'Painel – Estoque Familiar' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PainelEstoque />
    </Suspense>
  );
}
