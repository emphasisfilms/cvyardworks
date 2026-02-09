import Link from 'next/link';
import Hero from '@/components/Hero/Hero';
import SeasonalServices from '@/components/SeasonalServices/SeasonalServices';
import ServiceCard from '@/components/ServiceCard/ServiceCard';
import { services } from '@/data/services';

export default function Home() {
  return (
    <>
      <Hero />
      <SeasonalServices />

      {/* About Section */}
      <section className="section">
        <div className="container">
          <div className="grid-2">
            <div>
              <h2 className="section-heading">
                Yard Work: <span>Solved</span>
              </h2>
              <div className="accent-border-left">
                <p>
                  Connecticut Valley Yard Works is your full-service landscaping
                  and property maintenance partner in Walpole, New Hampshire. We
                  serve the greater Connecticut Valley region with professional,
                  reliable services year-round.
                </p>
                <p>
                  From spring cleanups and lawn installations to fall leaf
                  removal and winter snow plowing, our experienced crew handles
                  it all. We take pride in keeping your property looking its
                  best, no matter the season.
                </p>
                <p>
                  Locally owned and operated, we treat every property like our
                  own. Whether you need regular maintenance or a complete
                  landscape transformation, we&apos;re here to help.
                </p>
              </div>
              <div style={{ marginTop: '32px' }}>
                <Link href="/estimate" className="btn btn-primary">
                  Get a Free Estimate
                </Link>
              </div>
            </div>
            <div
              style={{
                background: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                color: 'var(--color-text-light)',
                fontSize: '0.9rem',
                textTransform: 'uppercase' as const,
                letterSpacing: '2px',
              }}
            >
              Property Image
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="section section-alt" id="services">
        <div className="container">
          <div className="text-center">
            <h2 className="section-heading">
              Year-Round <span>Services</span>
            </h2>
            <p className="section-subtitle centered">
              Professional landscaping, lawn care, and snow removal services for
              every season.
            </p>
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
            Ready to Transform <span>Your Property?</span>
          </h2>
          <p className="section-subtitle centered">
            Get a free, no-obligation estimate for any of our services.
            We&apos;re here to help with all your yard work needs.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <Link href="/estimate" className="btn btn-primary">
              Get a Free Estimate
            </Link>
            <a href="tel:6034996799" className="btn btn-secondary">
              Call (603) 499-6799
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
