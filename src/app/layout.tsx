import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { ADSENSE_CLIENT, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import '@/styles/globals.scss';

// Servida pelo próprio site, sem o @import do Google Fonts: aquele import
// bloqueava a pintura da página até a CSS de outro domínio chegar.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Jogos Grátis Online no Navegador`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Igor Fugiwara', url: 'https://igorfugiwara.netlify.app' }],
  creator: 'Igor Fugiwara',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: SITE_NAME,
    url: '/',
    title: `${SITE_NAME} — Jogos Grátis Online no Navegador`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Jogos Grátis Online no Navegador`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Search Console: cole o código da verificação por "Tag HTML" na variável
  // da Vercel. Num subdomínio vercel.app não há DNS para verificar por lá.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  // O AdSense aceita esta meta como prova de posse do site — é a forma que
  // ele próprio sugere, e não depende de o robô executar o script de anúncios.
  other: { 'google-adsense-account': ADSENSE_CLIENT },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
        {/* Anúncios automáticos e os blocos do AdBanner saem deste script. O
            consentimento (LGPD/GDPR) é a mensagem do próprio Google, ligada no
            painel em Privacidade e mensagens — não precisa de código aqui. */}
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
