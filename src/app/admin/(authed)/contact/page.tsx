import { fetchContent } from '@/lib/supabase/fetchContent';
import ContactEditor from './ContactEditor';

export const dynamic = 'force-dynamic';

const DEFAULT = {
  heading: 'Contact',
  headingAccent: 'Us',
  subtitle:
    "We'd love to hear from you. Reach out with any questions about our services.",
  phoneNote: 'Call or text anytime',
  locationNote: 'Serving the Connecticut Valley Region',
  hoursValue: 'Mon – Sat',
  hoursNote: '7:00 AM – 6:00 PM',
  ctaHeading: 'Need an',
  ctaHeadingAccent: 'Estimate?',
  ctaBody:
    "For project quotes and service requests, head over to our estimate page. We'll get back to you within 24 hours.",
};

export default async function AdminContactPage() {
  const { contact_page } = await fetchContent(['contact_page']);
  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Contact Page</h1>
          <p className="admin-page-subtitle">
            Headings, info cards, and CTA on /contact.
          </p>
        </div>
      </div>
      <ContactEditor initial={contact_page ?? DEFAULT} />
    </>
  );
}
