'use client';

import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT } from '@/lib/site';
import styles from './AdBanner.module.scss';

interface AdBannerProps {
  // ID numérico do bloco, criado no painel do AdSense depois da aprovação.
  // Vazio = não desenha nada (os anúncios automáticos seguem funcionando).
  slot: string;
}

export default function AdBanner({ slot }: AdBannerProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!slot) return;
    if (pushed.current) return;
    if (!insRef.current) return;
    if (insRef.current.getAttribute('data-adsbygoogle-status')) return;

    try {
      pushed.current = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      pushed.current = false;
    }
  }, [slot]);

  if (!slot) return null;

  return (
    // O rótulo é exigência das políticas: anúncio não pode se passar por
    // conteúdo do site, e numa página de jogo isso inclui parecer um botão.
    <aside className={styles.wrapper} aria-label="Publicidade">
      <span className={styles.label}>Publicidade</span>
      <ins
        ref={insRef}
        className={`adsbygoogle ${styles.ins}`}
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
