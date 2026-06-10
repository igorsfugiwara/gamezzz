import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import GameFrame from '@/components/GameFrame/GameFrame';
import GameCard from '@/components/GameCard/GameCard';
import AdBanner from '@/components/AdBanner/AdBanner';
import { games } from '@/data/games';
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
  return {
    title: `${game.title} — Jogar Online Grátis | gamezzz`,
    description: game.description,
  };
}

export default function GamePage({ params }: { params: { slug: string } }) {
  const game = games.find((g) => g.slug === params.slug);
  if (!game) notFound();

  const others = games.filter((g) => g.slug !== params.slug).slice(0, 2);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* BREADCRUMB */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true"> › </span>
          <Link href="/#jogos">Jogos</Link>
          <span aria-hidden="true"> › </span>
          <span>{game.title}</span>
        </nav>

        <h1 className={styles.title}>{game.title}</h1>
        <span className={`${styles.badge} ${styles[`cat_${game.category}`]}`}>
          {game.category}
        </span>

        <div className={styles.frameWrapper}>
          <GameFrame src={game.src} title={game.title} />
        </div>

        <AdBanner />

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
        </section>

        {/* TAGS */}
        <div className={styles.tags}>
          {game.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>

        {/* OUTROS JOGOS */}
        {others.length > 0 && (
          <section className={styles.section}>
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
