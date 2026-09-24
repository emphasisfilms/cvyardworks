import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import PageHero from '@/components/PageHero/PageHero';
import JsonLd from '@/components/JsonLd/JsonLd';
import { SERVICE_PAGES } from '@/lib/service-pages';
import { AREA_NH, AREA_VT, breadcrumbJsonLd, graph, SITE_URL, pageMetadata } from '@/lib/seo';
import { getPhotoUrl } from '@/lib/supabase/storage';
import { fetchContent } from '@/lib/supabase/fetchContent';
import styles from './services.module.css';

const BANNER_PATH = 'page-banners/estimate.jpg';

export const dynamic = 'force-dynamic';

const TITLE = 'Landscaping, Lawn Care & Snow Removal Services | Walpole, NH';
const DESCRIPTION =
  'Year-round property services in Walpole, NH: landscaping and lawn installation, mowing and lawn care, fall cleanup, and snow plowing for homes and businesses across the Connecticut River Valley.';

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/services',
});

export default async function ServicesIndexPage() {
  const { site_settings } = await fetchContent(['site_settings']);
  const phone = site_settings?.phone ?? '(603) 499-6799';
  const phoneTel = site_settings?.phoneTel ?? '6034996799';

  const jsonLd = graph(
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
    ]),
    {
      '@type': 'ItemList',
      name: 'Connecticut Valley Yard Works services',
      itemListElement: SERVICE_PAGES.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: p.name,
        url: `${SITE_URL}/services/${p.slug}`,
      })),
    }
  );

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHero
        heading="Our"
        headingAccent="Services"
        subtitle="Landscaping, lawn care, fall cleanup and snow removal for homes and businesses in Walpole, NH and the Connecticut River Valley."
        photoPath={BANNER_PATH}
      />
      <section className={styles.page}>
        <div className={styles.container}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Services</span>
          </nav>

          <div className={styles.intro}>
            <h2 className="section-heading">
              Year-Round <span>Property Care</span>
            </h2>
            <p>
              Connecticut Valley Yard Works handles every season on your property. One crew,
              one phone number, from the first spring cleanup to the last plow of winter.
              Pick a service below to see what is included and get a free estimate.
            </p>
          </div>

          <div className={styles.grid}>
            {SERVICE_PAGES.map((p) => {
              const url = getPhotoUrl(p.photoPath);
              return (
                <article key={p.slug} className={styles.card}>
                  {url && (
                    <div className={styles.cardPhoto}>
                      <Image
                        src={url}
                        alt={`${p.name} in Walpole, NH by Connecticut Valley Yard Works`}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <h3>
                    <Link href={`/services/${p.slug}`}>
                      {p.heading} {p.headingAccent}
                    </Link>
                  </h3>
                  <p>{p.included.map((i) => i.title).join(' · ')}</p>
                  <Link href={`/services/${p.slug}`} className={styles.cardLink}>
                    Learn more &rarr;
                  </Link>
                </article>
              );
            })}
          </div>

          <div className={styles.areas}>
            <h2>Where We Work</h2>
            <p>
              Based in Walpole, NH. We serve towns on both sides of the Connecticut River,
              including:
            </p>
            <ul className={styles.areaList}>
              {AREA_NH.map((t) => (
                <li key={t}>{t}, NH</li>
              ))}
              {AREA_VT.map((t) => (
                <li key={t}>{t}, VT</li>
              ))}
            </ul>
          </div>

          <div className={styles.cta} style={{ marginTop: '44px' }}>
            <h2 className="section-heading">
              Ready to <span>Get Started?</span>
            </h2>
            <p>Free, no-obligation estimates for any service. We usually reply within 24 hours.</p>
            <div className={styles.ctaButtons}>
              <Link href="/estimate" className="btn btn-primary">
                Get a Free Estimate
              </Link>
              <a href={`tel:${phoneTel}`} className="btn btn-secondary">
                Call {phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
