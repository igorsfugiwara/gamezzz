// Tudo que identifica o site num lugar só: URL canônica, nome e a conta do
// AdSense. Quando o site ganhar domínio próprio, basta NEXT_PUBLIC_SITE_URL na
// Vercel — canonical, sitemap, robots e Open Graph acompanham.

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://gamezzz-one.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'gamezzz one';

export const SITE_DESCRIPTION =
  'Jogos grátis no navegador: xadrez contra IA, Snake, jogo da memória, Pong, Catan e PokéTrunfo. Sem download, sem cadastro, no computador e no celular.';

export const ADSENSE_CLIENT = 'ca-pub-1881797135791796';

// IDs dos blocos de anúncio. Só existem depois que o AdSense aprova o site e
// você cria os blocos no painel (Anúncios → Por bloco de anúncios). Sem eles,
// o AdBanner não desenha nada: bloco vazio é espaço morto na página e, com
// `data-ad-slot` inválido, o AdSense só devolve erro.
export const AD_SLOTS = {
  home: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME || '',
  jogo: process.env.NEXT_PUBLIC_ADSENSE_SLOT_JOGO || '',
};

export function absoluteUrl(path = '/') {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
