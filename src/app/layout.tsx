import type { Metadata } from 'next';
import Script from 'next/script';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import '@/styles/globals.scss';

export const metadata: Metadata = {
  title: 'gamezzz one — Jogos Gratuitos no Navegador',
  description:
    'Jogue Pong, Catan, PokéTrunfo e outros clássicos direto no navegador. Gratuito, sem download, sem cadastro.',
  keywords:
    'jogos grátis, jogos no navegador, pong online, catan online, pokemon trunfo, jogos html5',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1881797135791796"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
