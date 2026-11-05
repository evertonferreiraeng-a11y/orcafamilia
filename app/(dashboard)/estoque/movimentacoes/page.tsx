import { Suspense } from 'react';
import { MovimentacoesEstoque } from '@/components/estoque/MovimentacoesEstoque';

export const metadata = { title: 'Movimentações – Estoque Familiar' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MovimentacoesEstoque />
    </Suspense>
  );
}
