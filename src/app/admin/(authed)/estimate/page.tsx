import { fetchContent } from '@/lib/supabase/fetchContent';
import EstimateEditor from './EstimateEditor';

export const dynamic = 'force-dynamic';

const DEFAULT = {
  heading: 'Free',
  headingAccent: 'Estimate',
  subtitle:
    "Tell us about your project and we'll get back to you with a free, no-obligation estimate within 24 hours.",
  benefits: [
    'Locally owned & operated',
    'Year-round services',
    'Free estimates',
    'Reliable & professional',
    'Residential & commercial',
  ],
};

export default async function AdminEstimatePage() {
  const { estimate_page } = await fetchContent(['estimate_page']);
  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Estimate Page</h1>
          <p className="admin-page-subtitle">
            Heading and the “Why Choose Us” benefit list on /estimate.
          </p>
        </div>
      </div>
      <EstimateEditor initial={estimate_page ?? DEFAULT} />
    </>
  );
}
