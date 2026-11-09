import { Suspense } from 'react';
import { ManutencoesCasa } from '@/components/casa/TelasCasa';

export const metadata = { title: 'Manutenções – Casa' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ManutencoesCasa />
    </Suspense>
  );
}
