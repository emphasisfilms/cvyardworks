import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm/ContactForm';
import PageHero from '@/components/PageHero/PageHero';
import styles from './page.module.css';
import { fetchContent } from '@/lib/supabase/fetchContent';
import JsonLd from '@/components/JsonLd/JsonLd';
import { breadcrumbJsonLd, graph, pageMetadata } from '@/lib/seo';

const BANNER_PATH = 'page-banners/estimate.jpg';

export const dynamic = 'force-dynamic';

const TITLE = 'Free Estimate for Landscaping, Lawn Care & Snow Removal';
const DESCRIPTION =
  'Request a free, no-obligation estimate for landscaping, lawn care, fall cleanup or snow plowing in Walpole, NH and the Connecticut River Valley. We reply within 24 hours.';

export const metadata: Metadata = pageMetadata({
  title: `${TITLE} | Connecticut Valley Yard Works`,
  description: DESCRIPTION,
  path: '/estimate',
});

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

export default async function EstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const [{ estimate_page, site_settings }, { service }] = await Promise.all([
    fetchContent(['estimate_page', 'site_settings']),
    searchParams,
  ]);
  const c = estimate_page ?? DEFAULT;
  const phone = site_settings?.phone ?? '(603) 499-6799';
  const phoneTel = site_settings?.phoneTel ?? '6034996799';
  const location = site_settings?.location ?? 'Walpole, NH';
  const serviceArea = site_settings?.serviceArea ?? 'Connecticut Valley Region';

  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Free Estimate', path: '/estimate' },
          ])
        )}
      />
      <PageHero
        heading={c.heading}
        headingAccent={c.headingAccent}
        subtitle={c.subtitle}
        photoPath={BANNER_PATH}
      />
      <section className={styles.page}>
        <div className={styles.container}>
        <div className={styles.grid}>
          <ContactForm formType="estimate" defaultService={service} />

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
    </>
  );
}
