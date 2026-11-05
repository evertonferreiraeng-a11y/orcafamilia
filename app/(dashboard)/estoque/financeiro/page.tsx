import { Suspense } from 'react';
import { FinanceiroEstoque } from '@/components/estoque/FinanceiroEstoque';

export const metadata = { title: 'Financeiro – Estoque Familiar' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FinanceiroEstoque />
    </Suspense>
  );
}
