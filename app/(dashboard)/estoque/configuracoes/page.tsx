import { Suspense } from 'react';
import { ConfigEstoque } from '@/components/estoque/RelatoriosConfig';

export const metadata = { title: 'Configurações – Estoque Familiar' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ConfigEstoque />
    </Suspense>
  );
}
