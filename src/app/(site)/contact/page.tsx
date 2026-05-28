import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/PageHero/PageHero';
import styles from './page.module.css';
import { fetchContent } from '@/lib/supabase/fetchContent';

const BANNER_PATH = 'page-banners/contact.jpg';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact Us | Connecticut Valley Yard Works',
  description:
    'Get in touch with Connecticut Valley Yard Works in Walpole, NH. Call us at (603) 499-6799.',
};

const DEFAULT = {
  heading: 'Contact',
  headingAccent: 'Us',
  subtitle:
    "We'd love to hear from you. Reach out with any questions about our services.",
  phoneNote: 'Call or text anytime',
  locationNote: 'Serving the Connecticut Valley Region',
  hoursValue: 'Mon – Sat',
  hoursNote: '7:00 AM – 6:00 PM',
  ctaHeading: 'Need an',
  ctaHeadingAccent: 'Estimate?',
  ctaBody:
    "For project quotes and service requests, head over to our estimate page. We'll get back to you within 24 hours.",
};

export default async function ContactPage() {
  const { contact_page, site_settings } = await fetchContent([
    'contact_page',
    'site_settings',
  ]);
  const c = contact_page ?? DEFAULT;
  const phone = site_settings?.phone ?? '(603) 499-6799';
  const phoneTel = site_settings?.phoneTel ?? '6034996799';
  const location = site_settings?.location ?? 'Walpole, NH';

  return (
    <>
      <PageHero
        heading={c.heading}
        headingAccent={c.headingAccent}
        subtitle={c.subtitle}
        photoPath={BANNER_PATH}
      />
      <section className={styles.page}>
        <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>&#9742;</div>
            <h3>Phone</h3>
            <a href={`tel:${phoneTel}`} className={styles.cardValue}>
              {phone}
            </a>
            <p className={styles.cardNote}>{c.phoneNote}</p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>&#9993;</div>
            <h3>Location</h3>
            <p className={styles.cardValue}>{location}</p>
            <p className={styles.cardNote}>{c.locationNote}</p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>&#9200;</div>
            <h3>Hours</h3>
            <p className={styles.cardValue}>{c.hoursValue}</p>
            <p className={styles.cardNote}>{c.hoursNote}</p>
          </div>
        </div>

        <div className={styles.cta}>
          <h2 className="section-heading">
            {c.ctaHeading} <span>{c.ctaHeadingAccent}</span>
          </h2>
          <p>{c.ctaBody}</p>
          <Link href="/estimate" className="btn btn-primary">
            Request a Free Estimate
          </Link>
        </div>
        </div>
      </section>
    </>
  );
}
