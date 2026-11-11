import { redirect } from 'next/navigation';

// Itens e equipamentos agora ficam junto das manutenções preventivas.
export default function Page() {
  redirect('/casa/manutencoes?visao=equipamentos');
}
