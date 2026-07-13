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
  const social = settings.social ?? { facebook: null, instagram: null };

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
            {(social.facebook || social.instagram) && (
              <div className={styles.social}>
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className={styles.socialLink}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d="M13.5 21v-8.3h2.8l.4-3.2h-3.2V7.4c0-.9.3-1.6 1.6-1.6h1.7V2.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.2h2.8V21h3.4z" />
                    </svg>
                  </a>
                )}
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className={styles.socialLink}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                )}
              </div>
            )}
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
          <Link href="/admin/login" className={styles.admin}>Admin Login</Link>
        </div>
      </div>
    </footer>
  );
}
