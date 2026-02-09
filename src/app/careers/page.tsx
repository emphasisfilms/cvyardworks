import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm/ContactForm';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Join Our Team | Connecticut Valley Yard Works',
  description:
    'Join the Connecticut Valley Yard Works team. We are looking for hardworking, reliable individuals to join our landscaping and snow removal crew.',
};

export default function CareersPage() {
  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className="section-heading">
            Join Our <span>Team</span>
          </h1>
          <p className="section-subtitle">
            We&apos;re always looking for hardworking, reliable people to join our
            growing team.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.info}>
            <div className={styles.card}>
              <h3>Why Work With Us</h3>
              <ul className={styles.perks}>
                <li>
                  <strong>Year-Round Work</strong>
                  <p>Landscaping in warm months, snow removal in winter — steady work all year.</p>
                </li>
                <li>
                  <strong>Outdoor Work</strong>
                  <p>Spend your days outside working with your hands, not stuck behind a desk.</p>
                </li>
                <li>
                  <strong>Growth Opportunities</strong>
                  <p>Build your skills and grow with our company as we expand our services.</p>
                </li>
                <li>
                  <strong>Local Team</strong>
                  <p>Work close to home in the Connecticut Valley with a tight-knit crew.</p>
                </li>
              </ul>
            </div>

            <div className={styles.card}>
              <h3>Open Positions</h3>
              <div className={styles.positions}>
                <div className={styles.position}>
                  <strong>Landscaping Crew Member</strong>
                  <p>Full-time &middot; Seasonal / Year-round</p>
                </div>
                <div className={styles.position}>
                  <strong>Lawn Maintenance Technician</strong>
                  <p>Full-time &middot; Seasonal</p>
                </div>
                <div className={styles.position}>
                  <strong>Snow Removal Operator</strong>
                  <p>Seasonal &middot; On-call</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className={styles.formHeading}>Apply Now</h2>
            <ContactForm formType="careers" />
          </div>
        </div>
      </div>
    </section>
  );
}
