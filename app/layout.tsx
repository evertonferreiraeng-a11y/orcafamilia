import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'OrçaFamília — Controle financeiro do casal',
    template: '%s · OrçaFamília',
  },
  description: 'Painel de controle financeiro para o casal: contas, cartões, orçamentos e metas em um só lugar.',
  applicationName: 'OrçaFamília',
};

export const viewport: Viewport = {
  themeColor: '#2a78d6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
