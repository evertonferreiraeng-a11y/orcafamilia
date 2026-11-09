import { Suspense } from 'react';
import { ItensCasa } from '@/components/casa/TelasCasa';

export const metadata = { title: 'Itens e equipamentos – Casa' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ItensCasa />
    </Suspense>
  );
}
