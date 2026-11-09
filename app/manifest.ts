import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Life — Apps da família',
    short_name: 'Life',
    description: 'Apps da família em um só lugar: orçamento familiar e gestão do estoque de emergência de alimentos e água.',
    start_url: '/inicio',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2a78d6',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
