import { fetchContent } from '@/lib/supabase/fetchContent';
import SettingsEditor from './SettingsEditor';

export const dynamic = 'force-dynamic';

const DEFAULT = {
  businessName: 'Connecticut Valley Yard Works',
  shortName: 'CV Yard Works',
  phone: '(603) 499-6799',
  phoneTel: '6034996799',
  location: 'Walpole, NH',
  serviceArea: 'Connecticut Valley Region',
  hoursLine: 'Mon – Sat · 7:00 AM – 6:00 PM',
  social: { facebook: null as string | null, instagram: null as string | null },
};

export default async function AdminSettingsPage() {
  const { site_settings } = await fetchContent(['site_settings']);
  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Site Settings</h1>
          <p className="admin-page-subtitle">
            Business name, phone, location, hours, and social links. Used across
            every page on the site.
          </p>
        </div>
      </div>
      <SettingsEditor initial={site_settings ?? DEFAULT} />
    </>
  );
}
