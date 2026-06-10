import Link from 'next/link';
import styles from './Footer.module.scss';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>
            gamezzz one
          </Link>
          <p className={styles.tagline}>Jogos gratuitos no navegador</p>
        </div>

        <nav className={styles.nav}>
          <Link href="/">Home</Link>
          <Link href="/sobre">Sobre</Link>
          <Link href="/privacidade">Privacidade</Link>
        </nav>

        <div className={styles.credits}>
          <p>
            Desenvolvido por{' '}
            <a
              href="https://igorfugiwara.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              Igor Fugiwara
            </a>
          </p>
          <p className={styles.copy}>© 2026 gamezzz one</p>
        </div>
      </div>
    </footer>
  );
}
