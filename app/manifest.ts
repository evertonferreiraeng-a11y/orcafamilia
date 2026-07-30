import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OrçaFamília — Controle financeiro do casal',
    short_name: 'OrçaFamília',
    description: 'Painel de controle financeiro para o casal: contas, cartões, orçamentos e metas em um só lugar.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2a78d6',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
