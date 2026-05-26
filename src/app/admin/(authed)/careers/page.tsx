import { fetchContent } from '@/lib/supabase/fetchContent';
import CareersEditor from './CareersEditor';

export const dynamic = 'force-dynamic';

const DEFAULT = {
  heading: 'Join Our',
  headingAccent: 'Team',
  subtitle:
    "We're always looking for hardworking, reliable people to join our growing team.",
  perks: [
    {
      title: 'Year-Round Work',
      body: 'Landscaping in warm months, snow removal in winter — steady work all year.',
    },
    {
      title: 'Outdoor Work',
      body: 'Spend your days outside working with your hands, not stuck behind a desk.',
    },
    {
      title: 'Growth Opportunities',
      body: 'Build your skills and grow with our company as we expand our services.',
    },
    {
      title: 'Local Team',
      body: 'Work close to home in the Connecticut Valley with a tight-knit crew.',
    },
  ],
  positions: [
    { title: 'Landscaping Crew Member', detail: 'Full-time · Seasonal / Year-round' },
    { title: 'Lawn Maintenance Technician', detail: 'Full-time · Seasonal' },
    { title: 'Snow Removal Operator', detail: 'Seasonal · On-call' },
  ],
};

export default async function AdminCareersPage() {
  const { careers_page } = await fetchContent(['careers_page']);
  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Careers Page</h1>
          <p className="admin-page-subtitle">
            Heading, perks, and open positions on /careers.
          </p>
        </div>
      </div>
      <CareersEditor initial={careers_page ?? DEFAULT} />
    </>
  );
}
