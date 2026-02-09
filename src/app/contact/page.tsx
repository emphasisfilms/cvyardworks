import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Contact Us | Connecticut Valley Yard Works',
  description:
    'Get in touch with Connecticut Valley Yard Works in Walpole, NH. Call us at (603) 499-6799.',
};

export default function ContactPage() {
  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className="section-heading">
            Contact <span>Us</span>
          </h1>
          <p className="section-subtitle">
            We&apos;d love to hear from you. Reach out with any questions about our
            services.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>&#9742;</div>
            <h3>Phone</h3>
            <a href="tel:6034996799" className={styles.cardValue}>
              (603) 499-6799
            </a>
            <p className={styles.cardNote}>Call or text anytime</p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>&#9993;</div>
            <h3>Location</h3>
            <p className={styles.cardValue}>Walpole, NH</p>
            <p className={styles.cardNote}>Serving the Connecticut Valley Region</p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>&#9200;</div>
            <h3>Hours</h3>
            <p className={styles.cardValue}>Mon &ndash; Sat</p>
            <p className={styles.cardNote}>7:00 AM &ndash; 6:00 PM</p>
          </div>
        </div>

        <div className={styles.cta}>
          <h2 className="section-heading">
            Need an <span>Estimate?</span>
          </h2>
          <p>
            For project quotes and service requests, head over to our estimate
            page. We&apos;ll get back to you within 24 hours.
          </p>
          <Link href="/estimate" className="btn btn-primary">
            Request a Free Estimate
          </Link>
        </div>
      </div>
    </section>
  );
}
