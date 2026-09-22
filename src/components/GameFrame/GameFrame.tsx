'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './GameFrame.module.scss';

interface GameFrameProps {
  src: string;
  title: string;
}

export default function GameFrame({ src, title }: GameFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Modo imersivo por CSS: o iframe vira `position: fixed; inset: 0`.
  // É o fallback obrigatório — o Safari do iPhone não implementa
  // `requestFullscreen` em iframe, então lá o botão nativo não faz nada.
  const [imersivo, setImersivo] = useState(false);

  const entrar = useCallback(() => {
    const alvo = wrapperRef.current;
    // Em tela de toque o modo CSS é melhor de propósito: a barra do navegador
    // some do mesmo jeito e dá para sair com um botão visível, sem depender do
    // gesto de "puxar de cima" que cada sistema faz diferente.
    const toque = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

    if (!toque && alvo?.requestFullscreen) {
      alvo.requestFullscreen().catch(() => setImersivo(true));
      return;
    }
    setImersivo(true);
  }, []);

  const sair = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setImersivo(false);
  }, []);

  // Sair com ESC também no modo CSS, onde o navegador não faz isso sozinho.
  useEffect(() => {
    if (!imersivo) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImersivo(false);
    };
    // Trava a rolagem do fundo enquanto o jogo ocupa a tela.
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', aoTeclar);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [imersivo]);

  return (
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${imersivo ? styles.imersivo : ''}`}
    >
      <div className={styles.toolbar}>
        <span className={styles.gameTitle}>{title}</span>
        <button
          className={styles.fullscreen}
          onClick={imersivo ? sair : entrar}
          title={imersivo ? 'Sair da tela cheia' : 'Tela cheia'}
        >
          {imersivo ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Sair
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
              Tela Cheia
            </>
          )}
        </button>
      </div>
      <div className={styles.container}>
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          width="100%"
          height="100%"
          allow="fullscreen; autoplay"
          loading="lazy"
          className={styles.iframe}
        />
      </div>
    </div>
  );
}
