import Link from 'next/link';
import styles from './Footer.module.css';
import type { SiteSettingsContent } from '@/lib/supabase/content-types';

const DEFAULT: SiteSettingsContent = {
  businessName: 'Connecticut Valley Yard Works',
  shortName: 'CV Yard Works',
  phone: '(603) 499-6799',
  phoneTel: '6034996799',
  location: 'Walpole, NH',
  serviceArea: 'Connecticut Valley Region',
  hoursLine: 'Mon – Sat · 7:00 AM – 6:00 PM',
  social: { facebook: null, instagram: null },
};

export default function Footer({
  settings = DEFAULT,
}: {
  settings?: SiteSettingsContent;
}) {
  const [accent, ...restWords] = settings.shortName.split(/\s+/);
  const rest = restWords.join(' ');

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <h3 className={styles.logo}>
              <span className={styles.logoAccent}>{accent}</span>
              {rest ? ` ${rest}` : ''}
            </h3>
            <p className={styles.tagline}>Yard Work: Solved</p>
            <p className={styles.description}>
              Professional landscaping, lawn care, and snow removal services
              for the {settings.serviceArea}.
            </p>
          </div>

          <div className={styles.links}>
            <h4 className={styles.heading}>Quick Links</h4>
            <nav>
              <Link href="/" className={styles.link}>Home</Link>
              <Link href="/#services" className={styles.link}>Services</Link>
              <Link href="/estimate" className={styles.link}>Free Estimate</Link>
              <Link href="/contact" className={styles.link}>Contact</Link>
              <Link href="/careers" className={styles.link}>Careers</Link>
            </nav>
          </div>

          <div className={styles.contact}>
            <h4 className={styles.heading}>Contact</h4>
            <p className={styles.contactItem}>
              <strong>Phone:</strong>{' '}
              <a href={`tel:${settings.phoneTel}`}>{settings.phone}</a>
            </p>
            <p className={styles.contactItem}>
              <strong>Location:</strong> {settings.location}
            </p>
            <p className={styles.contactItem}>
              <strong>Service Area:</strong> {settings.serviceArea}
            </p>
            <p className={styles.contactItem}>
              <strong>Hours:</strong> {settings.hoursLine}
            </p>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} {settings.businessName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
