import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  HeroContent,
  HomeAboutContent,
  HomeCtaContent,
} from '@/lib/supabase/content-types';
import HomeEditor from './HomeEditor';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('cvy_site_content')
    .select('key, value')
    .in('key', ['hero', 'home_about', 'home_cta']);

  if (error) {
    return (
      <>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Home Page</h1>
        </div>
        <div className="admin-card">
          <p className="admin-card-desc" style={{ color: '#d97070' }}>
            Couldn’t load content: {error.message}
          </p>
        </div>
      </>
    );
  }

  const byKey = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));

  const hero = byKey['hero'] as HeroContent;
  const homeAbout = byKey['home_about'] as HomeAboutContent;
  const homeCta = byKey['home_cta'] as HomeCtaContent;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Home Page</h1>
          <p className="admin-page-subtitle">
            Hero, About, and CTA sections. Each section saves independently.
          </p>
        </div>
      </div>
      <HomeEditor hero={hero} homeAbout={homeAbout} homeCta={homeCta} />
    </>
  );
}
