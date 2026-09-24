import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHero from '@/components/PageHero/PageHero';
import JsonLd from '@/components/JsonLd/JsonLd';
import { SERVICE_PAGES, getServicePage } from '@/lib/service-pages';
import {
  AREA_NH,
  AREA_VT,
  BUSINESS_NAME,
  breadcrumbJsonLd,
  faqJsonLd,
  graph,
  pageMetadata,
  SITE_URL,
} from '@/lib/seo';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchContent } from '@/lib/supabase/fetchContent';
import styles from '../services.module.css';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = getServicePage(slug);
  if (!page) return {};
  const path = `/services/${page.slug}`;
  return pageMetadata({ title: page.title, description: page.description, path });
}

export default async function ServicePage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = getServicePage(slug);
  if (!page) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ site_settings }, { data: row }] = await Promise.all([
    fetchContent(['site_settings']),
    supabase.from('cvy_services').select('photo_path').eq('id', page.season).maybeSingle(),
  ]);
  const phone = site_settings?.phone ?? '(603) 499-6799';
  const phoneTel = site_settings?.phoneTel ?? '6034996799';
  const bannerPath = (row?.photo_path as string | null) ?? page.photoPath;
  const path = `/services/${page.slug}`;

  const jsonLd = graph(
    {
      '@type': 'Service',
      '@id': `${SITE_URL}${path}#service`,
      name: `${page.heading} ${page.headingAccent}`,
      serviceType: page.serviceType,
      description: page.description,
      url: `${SITE_URL}${path}`,
      provider: { '@id': `${SITE_URL}/#business` },
      areaServed: [
        ...AREA_NH.map((c) => ({ '@type': 'City', name: `${c}, NH` })),
        ...AREA_VT.map((c) => ({ '@type': 'City', name: `${c}, VT` })),
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: `${page.name} services`,
        itemListElement: page.included.map((i) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: i.title, description: i.body },
        })),
      },
    },
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
      { name: page.name, path },
    ]),
    faqJsonLd(page.faqs)
  );

  const others = SERVICE_PAGES.filter((p) => p.slug !== page.slug);

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHero
        heading={page.heading}
        headingAccent={page.headingAccent}
        subtitle={`${page.name} for homes and businesses in Walpole, NH and the Connecticut River Valley.`}
        photoPath={bannerPath}
      />
      <section className={styles.page}>
        <div className={styles.container}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/services">Services</Link>
            <span aria-hidden="true">/</span>
            <span>{page.name}</span>
          </nav>

          <div className={styles.intro}>
            <h2 className="section-heading">
              {page.name} in <span>Walpole, NH</span>
            </h2>
            {page.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className={styles.grid}>
            {page.included.map((item) => (
              <div key={item.title} className={styles.card}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>

          <div className={styles.split}>
            <div>
              <h2 className="section-heading">
                Common <span>Questions</span>
              </h2>
              <div className={styles.faq}>
                {page.faqs.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
            <div className={styles.areas}>
              <h2>{page.name} Service Area</h2>
              <p>
                {BUSINESS_NAME} is based in Walpole, NH and serves towns on both sides of the
                Connecticut River, including:
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
          </div>

          <div className={styles.cta}>
            <h2 className="section-heading">
              Get a Free <span>{page.name} Estimate</span>
            </h2>
            <p>
              Tell us about the property and we will come out, take a look and send a written
              quote. No obligation.
            </p>
            <div className={styles.ctaButtons}>
              <Link href={`/estimate?service=${page.season}`} className="btn btn-primary">
                Request an Estimate
              </Link>
              <a href={`tel:${phoneTel}`} className="btn btn-secondary">
                Call {phone}
              </a>
            </div>
          </div>

          <div className={styles.related}>
            <h2>Other Services</h2>
            <ul className={styles.relatedList}>
              {others.map((p) => (
                <li key={p.slug}>
                  <Link href={`/services/${p.slug}`}>
                    {p.heading} {p.headingAccent}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
