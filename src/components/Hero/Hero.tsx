import Link from 'next/link';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.overlay}></div>
      <div className={styles.content}>
        <p className={styles.tagline}>Walpole, NH &mdash; Connecticut Valley Region</p>
        <h1 className={styles.title}>
          Connecticut Valley<br />
          <span className={styles.titleAccent}>Yard Works</span>
        </h1>
        <p className={styles.subtitle}>Yard Work: Solved</p>
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
