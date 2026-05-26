import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchContent } from '@/lib/supabase/fetchContent';
import type { Service } from '@/lib/supabase/content-types';
import ServicesEditor from './ServicesEditor';

export const dynamic = 'force-dynamic';

export default async function AdminServicesPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: services, error: servicesError }, { home_services_intro }] =
    await Promise.all([
      supabase.from('cvy_services').select('*').order('sort_order'),
      fetchContent(['home_services_intro']),
    ]);

  if (servicesError) {
    return (
      <>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Services</h1>
        </div>
        <div className="admin-card">
          <p className="admin-card-desc" style={{ color: '#d97070' }}>
            Couldn’t load services: {servicesError.message}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Services</h1>
          <p className="admin-page-subtitle">
            The four seasonal services and the section heading on the homepage.
          </p>
        </div>
      </div>
      <ServicesEditor
        intro={
          home_services_intro ?? {
            heading: 'Year-Round',
            headingAccent: 'Services',
            subtitle:
              'Professional landscaping, lawn care, and snow removal services for every season.',
          }
        }
        services={(services as Service[]) ?? []}
      />
    </>
  );
}
