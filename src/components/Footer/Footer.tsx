import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <h3 className={styles.logo}>
              <span className={styles.logoAccent}>CV</span> Yard Works
            </h3>
            <p className={styles.tagline}>Yard Work: Solved</p>
            <p className={styles.description}>
              Professional landscaping, lawn care, and snow removal services
              for the Connecticut Valley region.
            </p>
          </div>

          <div className={styles.links}>
            <h4 className={styles.heading}>Quick Links</h4>
            <nav>
              <Link href="/" className={styles.link}>Home</Link>
              <Link href="/#services" className={styles.link}>Services</Link>
              <Link href="/estimate" className={styles.link}>Free Estimate</Link>
              <Link href="/contact" className={styles.link}>Contact</Link>
              <Link href="/careers" className={styles.link}>Careers</Link>
            </nav>
          </div>

          <div className={styles.contact}>
            <h4 className={styles.heading}>Contact</h4>
            <p className={styles.contactItem}>
              <strong>Phone:</strong>{' '}
              <a href="tel:6034996799">(603) 499-6799</a>
            </p>
            <p className={styles.contactItem}>
              <strong>Location:</strong> Walpole, NH
            </p>
            <p className={styles.contactItem}>
              <strong>Service Area:</strong> Connecticut Valley Region
            </p>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} Connecticut Valley Yard Works. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
