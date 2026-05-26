import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm/ContactForm';
import styles from './page.module.css';
import { fetchContent } from '@/lib/supabase/fetchContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Free Estimate | Connecticut Valley Yard Works',
  description:
    'Request a free estimate for landscaping, lawn care, or snow removal services in the Connecticut Valley region.',
};

const DEFAULT = {
  heading: 'Free',
  headingAccent: 'Estimate',
  subtitle:
    "Tell us about your project and we'll get back to you with a free, no-obligation estimate within 24 hours.",
  benefits: [
    'Locally owned & operated',
    'Year-round services',
    'Free estimates',
    'Reliable & professional',
    'Residential & commercial',
  ],
};

export default async function EstimatePage() {
  const { estimate_page, site_settings } = await fetchContent([
    'estimate_page',
    'site_settings',
  ]);
  const c = estimate_page ?? DEFAULT;
  const phone = site_settings?.phone ?? '(603) 499-6799';
  const phoneTel = site_settings?.phoneTel ?? '6034996799';
  const location = site_settings?.location ?? 'Walpole, NH';
  const serviceArea = site_settings?.serviceArea ?? 'Connecticut Valley Region';

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className="section-heading">
            {c.heading} <span>{c.headingAccent}</span>
          </h1>
          <p className="section-subtitle">{c.subtitle}</p>
        </div>

        <div className={styles.grid}>
          <ContactForm formType="estimate" />

          <aside className={styles.sidebar}>
            <div className={styles.infoCard}>
              <h3>Get in Touch</h3>
              <div className={styles.infoItem}>
                <strong>Phone</strong>
                <a href={`tel:${phoneTel}`}>{phone}</a>
              </div>
              <div className={styles.infoItem}>
                <strong>Location</strong>
                <p>{location}</p>
              </div>
              <div className={styles.infoItem}>
                <strong>Service Area</strong>
                <p>{serviceArea}</p>
              </div>
            </div>

            <div className={styles.infoCard}>
              <h3>Why Choose Us</h3>
              <ul className={styles.benefits}>
                {c.benefits.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
