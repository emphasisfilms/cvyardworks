import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm/ContactForm';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Free Estimate | Connecticut Valley Yard Works',
  description:
    'Request a free estimate for landscaping, lawn care, or snow removal services in the Connecticut Valley region.',
};

export default function EstimatePage() {
  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className="section-heading">
            Free <span>Estimate</span>
          </h1>
          <p className="section-subtitle">
            Tell us about your project and we&apos;ll get back to you with a free,
            no-obligation estimate within 24 hours.
          </p>
        </div>

        <div className={styles.grid}>
          <ContactForm formType="estimate" />

          <aside className={styles.sidebar}>
            <div className={styles.infoCard}>
              <h3>Get in Touch</h3>
              <div className={styles.infoItem}>
                <strong>Phone</strong>
                <a href="tel:6034996799">(603) 499-6799</a>
              </div>
              <div className={styles.infoItem}>
                <strong>Location</strong>
                <p>Walpole, NH</p>
              </div>
              <div className={styles.infoItem}>
                <strong>Service Area</strong>
                <p>Connecticut Valley Region</p>
              </div>
            </div>

            <div className={styles.infoCard}>
              <h3>Why Choose Us</h3>
              <ul className={styles.benefits}>
                <li>Locally owned &amp; operated</li>
                <li>Year-round services</li>
                <li>Free estimates</li>
                <li>Reliable &amp; professional</li>
                <li>Residential &amp; commercial</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
