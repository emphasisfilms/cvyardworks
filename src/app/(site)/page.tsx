import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import JsonLd from '@/components/JsonLd/JsonLd';
import { SERVICE_PAGES } from '@/lib/service-pages';
import { AREA_NH, AREA_VT, faqJsonLd, graph, pageMetadata } from '@/lib/seo';
import Hero from '@/components/Hero/Hero';
import SeasonalServices from '@/components/SeasonalServices/SeasonalServices';
import ServiceCard from '@/components/ServiceCard/ServiceCard';
import { services as fallbackServices } from '@/data/services';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchContent } from '@/lib/supabase/fetchContent';
import { getPhotoUrl } from '@/lib/supabase/storage';
import type { Service } from '@/lib/supabase/content-types';

export const metadata: Metadata = pageMetadata({
  title: 'Landscaping, Lawn Care & Snow Removal in Walpole, NH | Connecticut Valley Yard Works',
  description:
    'Connecticut Valley Yard Works: landscaping, lawn installation, mowing, fall cleanup and snow plowing for homes and businesses in Walpole, NH and the Connecticut River Valley. Free estimates. Call (603) 499-6799.',
  path: '/',
});

const HOME_FAQS = [
  {
    q: 'What areas does Connecticut Valley Yard Works serve?',
    a: `We are based in Walpole, NH and serve the Connecticut River Valley on both sides of the river, including ${AREA_NH.slice(0, 6).join(', ')} in New Hampshire and ${AREA_VT.slice(0, 4).join(', ')} in Vermont.`,
  },
  {
    q: 'What services do you offer?',
    a: 'Landscaping and lawn installation (sod, hydroseeding, hand seeding), spring cleanup and mulching, weekly mowing and lawn care, hedge trimming, fertilizing, fall leaf cleanup, and winter snow plowing, sanding, salting and roof snow removal.',
  },
  {
    q: 'Do you offer free estimates?',
    a: 'Yes. Request a free estimate online or call (603) 499-6799. We visit the property, then send a written quote with no obligation, usually within 24 hours.',
  },
  {
    q: 'Do you do commercial as well as residential work?',
    a: 'Yes. We maintain homes, camps, rental properties, associations and commercial lots, and can combine summer lawn care with a winter plowing contract.',
  },
];

const DEFAULT_ABOUT = {
  heading: 'Yard Work',
  headingAccent: 'Solved',
  paragraphs: [
    'Connecticut Valley Yard Works is your full-service landscaping and property maintenance partner in Walpole, New Hampshire. We serve the greater Connecticut Valley region with professional, reliable services year-round.',
    'From spring cleanups and lawn installations to fall leaf removal and winter snow plowing, our experienced crew handles it all. We take pride in keeping your property looking its best, no matter the season.',
    "Locally owned and operated, we treat every property like our own. Whether you need regular maintenance or a complete landscape transformation, we're here to help.",
  ],
  imagePath: null as string | null,
};

const DEFAULT_SERVICES_INTRO = {
  heading: 'Year-Round',
  headingAccent: 'Services',
  subtitle:
    'Professional landscaping, lawn care, and snow removal services for every season.',
};

const DEFAULT_CTA = {
  heading: 'Ready to Transform',
  headingAccent: 'Your Property?',
  subtitle:
    "Get a free, no-obligation estimate for any of our services. We're here to help with all your yard work needs.",
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const [
    { hero, home_about, home_services_intro, home_cta, site_settings },
    { data: rows },
  ] = await Promise.all([
    fetchContent([
      'hero',
      'home_about',
      'home_services_intro',
      'home_cta',
      'site_settings',
    ]),
    supabase.from('cvy_services').select('*').order('sort_order'),
  ]);

  const about = home_about ?? DEFAULT_ABOUT;
  const servicesIntro = home_services_intro ?? DEFAULT_SERVICES_INTRO;
  const cta = home_cta ?? DEFAULT_CTA;
  const phone = site_settings?.phone ?? '(603) 499-6799';
  const phoneTel = site_settings?.phoneTel ?? '6034996799';

  const services: Service[] =
    rows && rows.length > 0
      ? (rows as Service[])
      : fallbackServices.map((s) => ({ ...s, photo_path: null, sort_order: 0 }));

  const aboutImageUrl = getPhotoUrl(about.imagePath);

  return (
    <>
      <JsonLd data={graph(faqJsonLd(HOME_FAQS))} />
      <Hero content={hero} />
      <SeasonalServices services={services} />

      {/* About Section */}
      <section className="section">
        <div className="container">
          <div className={aboutImageUrl ? 'grid-2' : undefined}>
            <div>
              <h2 className="section-heading">
                {about.heading} <span>{about.headingAccent}</span>
              </h2>
              <div className="accent-border-left">
                {about.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div style={{ marginTop: '32px' }}>
                <Link href="/estimate" className="btn btn-primary">
                  Get a Free Estimate
                </Link>
              </div>
            </div>
            {aboutImageUrl && (
              <div
                style={{
                  background: 'var(--color-bg-alt)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  minHeight: '340px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Image
                  src={aboutImageUrl}
                  alt="A property maintained by Connecticut Valley Yard Works"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="section section-alt" id="services">
        <div className="container">
          <div className="text-center">
            <h2 className="section-heading">
              {servicesIntro.heading} <span>{servicesIntro.headingAccent}</span>
            </h2>
            <p className="section-subtitle centered">{servicesIntro.subtitle}</p>
          </div>
          <div className="grid-4">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="section">
        <div className="container">
          <div className="grid-2">
            <div>
              <h2 className="section-heading">
                Serving Walpole, NH <span>&amp; the Connecticut Valley</span>
              </h2>
              <div className="accent-border-left">
                <p>
                  Connecticut Valley Yard Works is a locally owned landscaping and snow removal
                  company in Walpole, New Hampshire. Our crews work throughout Cheshire and Sullivan
                  counties and across the river into Windham and Windsor counties, Vermont.
                </p>
                <p>
                  <strong>New Hampshire:</strong> {AREA_NH.join(', ')}.
                </p>
                <p>
                  <strong>Vermont:</strong> {AREA_VT.join(', ')}.
                </p>
                <p>
                  Not on the list? Call us. If you are within reach of Walpole we can probably help.
                </p>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
                {SERVICE_PAGES.map((p) => (
                  <Link key={p.slug} href={`/services/${p.slug}`} className="btn btn-secondary">
                    {p.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h2 className="section-heading">
                Common <span>Questions</span>
              </h2>
              {HOME_FAQS.map((f) => (
                <details
                  key={f.q}
                  style={{
                    background: 'var(--color-bg-alt)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: '14px 18px',
                    marginBottom: '8px',
                  }}
                >
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{f.q}</summary>
                  <p style={{ marginTop: '10px', fontSize: '0.95rem' }}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section section-dark">
        <div className="container text-center">
          <h2 className="section-heading">
            {cta.heading} <span>{cta.headingAccent}</span>
          </h2>
          <p className="section-subtitle centered">{cta.subtitle}</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <Link href="/estimate" className="btn btn-primary">
              Get a Free Estimate
            </Link>
            <a href={`tel:${phoneTel}`} className="btn btn-secondary">
              Call {phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
