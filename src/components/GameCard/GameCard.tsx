import Link from 'next/link';
import Image from 'next/image';
import { Game } from '@/data/games';
import styles from './GameCard.module.scss';

const categoryColors: Record<Game['category'], string> = {
  clássico: '#f59e0b',
  estratégia: '#10b981',
  cartas: '#6366f1',
  ação: '#ef4444',
  'quebra-cabeça': '#ec4899',
};

interface GameCardProps {
  game: Game;
}

export default function GameCard({ game }: GameCardProps) {
  return (
    <Link href={`/jogos/${game.slug}`} className={styles.card}>
      <div className={styles.thumb}>
        <Image
          src={game.thumbnail}
          alt={game.title}
          width={400}
          height={225}
          className={styles.image}
        />
        <span
          className={styles.badge}
          style={{ backgroundColor: categoryColors[game.category] }}
        >
          {game.category}
        </span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{game.title}</h3>
        <p className={styles.desc}>{game.description}</p>
        <span className={styles.cta}>Jogar agora →</span>
      </div>
    </Link>
  );
}
