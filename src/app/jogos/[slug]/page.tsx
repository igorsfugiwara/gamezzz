import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import GameFrame from '@/components/GameFrame/GameFrame';
import GameCard from '@/components/GameCard/GameCard';
import AdBanner from '@/components/AdBanner/AdBanner';
import JsonLd from '@/components/JsonLd/JsonLd';
import { games, type Game } from '@/data/games';
import { AD_SLOTS, SITE_NAME, absoluteUrl } from '@/lib/site';
import styles from './page.module.scss';

export async function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const game = games.find((g) => g.slug === params.slug);
  if (!game) return {};

  // "Xadrez Online Grátis" é como as pessoas procuram; o nome do site entra
  // pelo template do layout.
  const title = `${game.title} Online Grátis — Jogar no Navegador`;
  const path = `/jogos/${game.slug}`;
  const image = { url: game.thumbnail, width: 800, height: 450, alt: game.title };

  return {
    title,
    description: game.description,
    keywords: game.tags,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      title: `${title} | ${SITE_NAME}`,
      description: game.description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description: game.description,
      images: [game.thumbnail],
    },
  };
}

const genero: Record<Game['category'], string> = {
  clássico: 'Arcade',
  estratégia: 'Estratégia',
  cartas: 'Cartas',
  ação: 'Ação',
};

function dadosEstruturados(game: Game) {
  const url = absoluteUrl(`/jogos/${game.slug}`);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: game.title,
      url,
      description: game.longDescription,
      image: absoluteUrl(game.thumbnail),
      genre: genero[game.category],
      keywords: game.tags.join(', '),
      inLanguage: 'pt-BR',
      gamePlatform: 'Navegador web',
      applicationCategory: 'Game',
      operatingSystem: 'Qualquer (navegador)',
      playMode: 'SinglePlayer',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Jogos', item: absoluteUrl('/#jogos') },
        { '@type': 'ListItem', position: 3, name: game.title, item: url },
      ],
    },
  ];
}

export default function GamePage({ params }: { params: { slug: string } }) {
  const game = games.find((g) => g.slug === params.slug);
  if (!game) notFound();

  // Todos os outros jogos: é o caminho mais curto para a próxima partida,
  // e para o buscador são links internos entre as páginas de jogo.
  const others = games.filter((g) => g.slug !== params.slug).slice(0, 4);

  return (
    <div className={styles.page}>
      <JsonLd data={dadosEstruturados(game)} />

      <div className={styles.stage}>
        {/* BREADCRUMB */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true"> › </span>
          <Link href="/#jogos">Jogos</Link>
          <span aria-hidden="true"> › </span>
          <span>{game.title}</span>
        </nav>

        <header className={styles.header}>
          <h1 className={styles.title}>{game.title}</h1>
          <span className={`${styles.badge} ${styles[`cat_${game.category}`]}`}>
            {game.category}
          </span>
        </header>

        <GameFrame src={game.src} title={game.title} />
      </div>

      <div className={styles.info}>
        <div className={styles.columns}>
          {/* COMO JOGAR */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Como Jogar</h2>
            <ol className={styles.howToList}>
              {game.howToPlay.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>

          {/* SOBRE O JOGO */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Sobre o Jogo</h2>
            <p className={styles.longDesc}>{game.longDescription}</p>

            <div className={styles.tags}>
              {game.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </div>

        {/* Longe do quadro de propósito: os controles de toque ficam no pé do
            jogo, e anúncio colado neles é clique acidental — o tipo de
            posicionamento que o AdSense pune. */}
        <AdBanner slot={AD_SLOTS.jogo} />

        {/* OUTROS JOGOS */}
        {others.length > 0 && (
          <section className={styles.others}>
            <h2 className={styles.sectionTitle}>Outros Jogos</h2>
            <div className={styles.grid}>
              {others.map((g) => (
                <GameCard key={g.slug} game={g} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
