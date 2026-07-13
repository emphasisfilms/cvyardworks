import Link from 'next/link';
import Image from 'next/image';
import Hero from '@/components/Hero/Hero';
import SeasonalServices from '@/components/SeasonalServices/SeasonalServices';
import ServiceCard from '@/components/ServiceCard/ServiceCard';
import { services as fallbackServices } from '@/data/services';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchContent } from '@/lib/supabase/fetchContent';
import { getPhotoUrl } from '@/lib/supabase/storage';
import type { Service } from '@/lib/supabase/content-types';

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
