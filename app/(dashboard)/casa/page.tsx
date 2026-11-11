import { Suspense } from 'react';
import { PainelCasa } from '@/components/casa/PainelCasa';

export const metadata = { title: 'Painel – Casa' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PainelCasa />
    </Suspense>
  );
}
