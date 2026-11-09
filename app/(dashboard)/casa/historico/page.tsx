import { Suspense } from 'react';
import { HistoricoCasa } from '@/components/casa/TelasCasa';

export const metadata = { title: 'Histórico – Casa' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HistoricoCasa />
    </Suspense>
  );
}
