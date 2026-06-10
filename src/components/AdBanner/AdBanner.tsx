'use client';

import { useEffect, useRef } from 'react';
import styles from './AdBanner.module.scss';

export default function AdBanner() {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
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
  }, []);

  return (
    <div className={styles.wrapper}>
      <ins
        ref={insRef}
        className={`adsbygoogle ${styles.ins}`}
        style={{ display: 'block' }}
        data-ad-client="ca-pub-1881797135791796"
        data-ad-slot="auto"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
