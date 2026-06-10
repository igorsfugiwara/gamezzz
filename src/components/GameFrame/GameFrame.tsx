'use client';

import { useRef } from 'react';
import styles from './GameFrame.module.scss';

interface GameFrameProps {
  src: string;
  title: string;
}

export default function GameFrame({ src, title }: GameFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleFullscreen = () => {
    if (iframeRef.current) {
      iframeRef.current.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <span className={styles.gameTitle}>{title}</span>
        <button className={styles.fullscreen} onClick={handleFullscreen} title="Tela cheia">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          Tela Cheia
        </button>
      </div>
      <div className={styles.container}>
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          width="100%"
          height="100%"
          allow="fullscreen"
          loading="lazy"
          className={styles.iframe}
        />
      </div>
    </div>
  );
}
