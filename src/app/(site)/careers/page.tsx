import type { Metadata } from 'next';
import HireForm from '@/components/HireForm/HireForm';
import styles from './page.module.css';
import { fetchContent } from '@/lib/supabase/fetchContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Join Our Team | Connecticut Valley Yard Works',
  description:
    'Join the Connecticut Valley Yard Works team. We are looking for hardworking, reliable individuals to join our landscaping and snow removal crew.',
};

const DEFAULT = {
  heading: 'Join Our',
  headingAccent: 'Team',
  subtitle:
    "We're always looking for hardworking, reliable people to join our growing team.",
  perks: [
    { title: 'Year-Round Work', body: 'Landscaping in warm months, snow removal in winter — steady work all year.' },
    { title: 'Outdoor Work', body: 'Spend your days outside working with your hands, not stuck behind a desk.' },
    { title: 'Growth Opportunities', body: 'Build your skills and grow with our company as we expand our services.' },
    { title: 'Local Team', body: 'Work close to home in the Connecticut Valley with a tight-knit crew.' },
  ],
  positions: [
    { title: 'Landscaping Crew Member', detail: 'Full-time · Seasonal / Year-round' },
    { title: 'Lawn Maintenance Technician', detail: 'Full-time · Seasonal' },
    { title: 'Snow Removal Operator', detail: 'Seasonal · On-call' },
  ],
};

export default async function CareersPage() {
  const { careers_page } = await fetchContent(['careers_page']);
  const c = careers_page ?? DEFAULT;

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className="section-heading">
            {c.heading} <span>{c.headingAccent}</span>
          </h1>
          <p className="section-subtitle">{c.subtitle}</p>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.card}>
            <h3>Why Work With Us</h3>
            <ul className={styles.perks}>
              {c.perks.map((perk, i) => (
                <li key={i}>
                  <strong>{perk.title}</strong>
                  <p>{perk.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.card}>
            <h3>Open Positions</h3>
            <div className={styles.positions}>
              {c.positions.map((pos, i) => (
                <div key={i} className={styles.position}>
                  <strong>{pos.title}</strong>
                  <p>{pos.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.formWrap}>
          <h2 className={styles.formHeading}>Join the Team</h2>
          <HireForm positions={c.positions} />
        </div>
      </div>
    </section>
  );
}
