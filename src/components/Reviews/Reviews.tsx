import { GOOGLE_MAPS_URL, GOOGLE_RATING, GOOGLE_REVIEW_URL, REVIEWS } from '@/lib/reviews';
import styles from './Reviews.module.css';

function Star({ fill }: { fill: number }) {
  const path = (
    <path d="M12 2.5l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.3l-6 3.3 1.3-6.6L2.4 9.4l6.7-.8z" />
  );
  return (
    <span className={styles.star} aria-hidden="true">
      <svg viewBox="0 0 24 24" className={styles.starBase} fill="currentColor">{path}</svg>
      <span className={styles.starFill} style={{ position: 'absolute', inset: 0, width: `${Math.round(fill * 100)}%` }}>
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>{path}</svg>
      </span>
    </span>
  );
}

export default function Reviews() {
  const { value, count } = GOOGLE_RATING;
  return (
    <section className="section" id="reviews" aria-labelledby="reviews-heading">
      <div className="container">
        <div className={styles.header}>
          <div>
            <h2 className="section-heading" id="reviews-heading">
              What Our <span>Customers Say</span>
            </h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Real reviews from homeowners and businesses around Walpole.
            </p>
          </div>
          <a
            className={styles.badge}
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${value} out of 5 stars on Google from ${count} reviews`}
          >
            <span className={styles.score}>{value.toFixed(1)}</span>
            <span className={styles.badgeText}>
              <span className={styles.stars}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} fill={Math.max(0, Math.min(1, value - i))} />
                ))}
              </span>
              <span className={styles.badgeLabel}>{count} Google reviews</span>
            </span>
          </a>
        </div>

        <div className={styles.grid}>
          {REVIEWS.map((r) => (
            <figure key={r.name} className={styles.card}>
              <blockquote className={styles.quote}>{r.text}</blockquote>
              <figcaption className={styles.who}>
                <strong>{r.name}</strong>
                <span>{r.when}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className={styles.actions}>
          <a href={GOOGLE_REVIEW_URL} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            Leave us a review
          </a>
          <a href={GOOGLE_MAPS_URL} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
            Read all reviews on Google
          </a>
        </div>
      </div>
    </section>
  );
}
