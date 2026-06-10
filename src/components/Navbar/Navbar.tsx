'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.scss';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          gamezzz
        </Link>

        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <ul className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
          <li>
            <Link href="/#jogos" onClick={() => setMenuOpen(false)}>
              Jogos
            </Link>
          </li>
          <li>
            <Link href="/sobre" onClick={() => setMenuOpen(false)}>
              Sobre
            </Link>
          </li>
          <li>
            <Link href="/privacidade" onClick={() => setMenuOpen(false)}>
              Privacidade
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
