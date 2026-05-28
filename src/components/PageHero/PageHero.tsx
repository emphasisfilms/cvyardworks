import { getPhotoUrl } from '@/lib/supabase/storage';
import styles from './PageHero.module.css';

export default function PageHero({
  heading,
  headingAccent,
  subtitle,
  photoPath,
}: {
  heading: string;
  headingAccent?: string;
  subtitle?: string;
  photoPath: string;
}) {
  const url = getPhotoUrl(photoPath);

  const bgStyle = url
    ? {
        backgroundImage: `linear-gradient(rgba(15, 20, 16, 0.55), rgba(15, 20, 16, 0.55)), url(${url})`,
      }
    : undefined;

  return (
    <section className={styles.banner} style={bgStyle}>
      <div className={styles.inner}>
        <h1 className={styles.title}>
          {heading}
          {headingAccent && (
            <>
              {' '}
              <span className={styles.accent}>{headingAccent}</span>
            </>
          )}
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </section>
  );
}
