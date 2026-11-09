import { Suspense } from 'react';
import { PrestadoresCasa } from '@/components/casa/TelasCasa';

export const metadata = { title: 'Prestadores – Casa' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PrestadoresCasa />
    </Suspense>
  );
}
