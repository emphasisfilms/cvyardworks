import Link from 'next/link';
import styles from './Hero.module.css';
import type { HeroContent } from '@/lib/supabase/content-types';
import { getPhotoUrl } from '@/lib/supabase/storage';

const DEFAULT_CONTENT: HeroContent = {
  tagline: 'Walpole, NH — Connecticut Valley Region',
  titleLine1: 'Connecticut Valley',
  titleLine2: 'Yard Works',
  subtitle: 'Yard Work: Solved',
  backgroundPath: null,
};

export default function Hero({ content }: { content?: HeroContent | null }) {
  const c = content ?? DEFAULT_CONTENT;
  const bgUrl = getPhotoUrl(c.backgroundPath);

  const heroStyle = bgUrl
    ? {
        backgroundImage: `linear-gradient(rgba(15, 20, 16, 0.55), rgba(15, 20, 16, 0.55)), url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  return (
    <section className={styles.hero} style={heroStyle}>
      <div className={styles.overlay}></div>
      <div className={styles.content}>
        <p className={styles.tagline}>{c.tagline}</p>
        <h1 className={styles.title}>
          {c.titleLine1}<br />
          <span className={styles.titleAccent}>{c.titleLine2}</span>
        </h1>
        <p className={styles.subtitle}>{c.subtitle}</p>
        <div className={styles.actions}>
          <Link href="/estimate" className="btn btn-primary">
            Get a Free Estimate
          </Link>
          <Link href="/#services" className="btn btn-secondary">
            Our Services
          </Link>
        </div>
      </div>
    </section>
  );
}
