import Link from 'next/link';
import type { Metadata } from 'next';
import GameCard from '@/components/GameCard/GameCard';
import { games } from '@/data/games';
import styles from './not-found.module.scss';

export const metadata: Metadata = {
  title: 'Página não encontrada',
  robots: { index: false },
};

// Um link quebrado vira caminho para um jogo, não um beco sem saída.
export default function NotFound() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Essa página não existe</h1>
      <p className={styles.desc}>
        O endereço pode ter mudado. Que tal uma partida enquanto isso?
      </p>
      <div className={styles.grid}>
        {games.slice(0, 3).map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>
      <Link href="/" className={styles.home}>
        Ver todos os jogos →
      </Link>
    </div>
  );
}
