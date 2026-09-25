import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchContent } from '@/lib/supabase/fetchContent';
import { fleetLocateConfig } from '@/lib/fleetlocate';
import FleetLocateCard from './integrations/FleetLocateCard';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();

  const [{ site_settings, hero, home_about }, services, clients, teams] = await Promise.all([
    fetchContent(['site_settings', 'hero', 'home_about']),
    supabase.from('cvy_services').select('id, photo_path'),
    supabase.from('cvy_clients').select('id, current_day, current_team, active'),
    supabase.from('cvy_teams').select('id, active, has_bagger, lead_name'),
  ]);

  const notifyTo = process.env.NOTIFY_EMAIL_TO ?? null;
  const emailReady = !!process.env.RESEND_API_KEY && !!notifyTo;
  const photosSet = (services.data ?? []).filter((s) => s.photo_path).length;
  const photosTotal = (services.data ?? []).length || 4;
  const social = site_settings?.social ?? { facebook: null, instagram: null };
  const socialCount = [social.facebook, social.instagram].filter(Boolean).length;

  const clientsReady = !clients.error;
  const activeClients = (clients.data ?? []).filter((c) => c.active !== false);
  const clientCount = activeClients.length;
  const inactiveCount = (clients.data ?? []).length - clientCount;
  const unassigned = activeClients.filter((c) => !c.current_day || !c.current_team).length;
  const teamsReady = !teams.error;
  const activeTeams = (teams.data ?? []).filter((t) => t.active);
  const baggerTeams = activeTeams.filter((t) => t.has_bagger).length;
  const teamsMissingLead = activeTeams.filter((t) => !t.lead_name).length;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">
            What the public site is showing right now. Click a card to change it.
          </p>
        </div>
      </div>

      <div className="admin-stats">
        <Link href="/admin/settings" className="admin-stat">
          <div className="admin-stat-label">Phone</div>
          <div className="admin-stat-value">{site_settings?.phone ?? '(603) 499-6799'}</div>
          <div className="admin-stat-hint">Header, footer, contact page</div>
        </Link>

        <Link href="/admin/settings" className="admin-stat">
          <div className="admin-stat-label">Hours</div>
          <div className="admin-stat-value">{site_settings?.hoursLine ?? 'Mon – Fri · 8:00 AM – 4:00 PM'}</div>
          <div className="admin-stat-hint">Footer and Google structured data</div>
        </Link>

        <div className="admin-stat">
          <div className="admin-stat-label">Form emails</div>
          <div className="admin-stat-value">
            {emailReady ? (
              <span className="admin-pill">On</span>
            ) : (
              <span className="admin-pill admin-pill-warn">Not configured</span>
            )}
          </div>
          <div className="admin-stat-hint">
            {emailReady ? `Estimate and job applications go to ${notifyTo}` : 'Set RESEND_API_KEY and NOTIFY_EMAIL_TO on Vercel'}
          </div>
        </div>

        <Link href="/admin/settings" className="admin-stat">
          <div className="admin-stat-label">Social links</div>
          <div className="admin-stat-value">
            {socialCount === 0 ? (
              <span className="admin-pill admin-pill-warn">None set</span>
            ) : (
              `${socialCount} of 2`
            )}
          </div>
          <div className="admin-stat-hint">
            {social.facebook ? 'Facebook ✓ ' : 'Facebook – '}
            {social.instagram ? 'Instagram ✓' : 'Instagram –'}
          </div>
        </Link>

        <Link href="/admin/home" className="admin-stat">
          <div className="admin-stat-label">Homepage photos</div>
          <div className="admin-stat-value">
            {hero?.backgroundPath ? 'Hero ✓' : 'Hero –'} · {home_about?.imagePath ? 'About ✓' : 'About –'}
          </div>
          <div className="admin-stat-hint">Banner and About section images</div>
        </Link>

        <Link href="/admin/services" className="admin-stat">
          <div className="admin-stat-label">Service photos</div>
          <div className="admin-stat-value">
            {photosSet} of {photosTotal}
          </div>
          <div className="admin-stat-hint">Spring, Summer, Fall, Winter cards</div>
        </Link>

        <Link href="/admin/clients" className="admin-stat">
          <div className="admin-stat-label">Clients &amp; routes</div>
          <div className="admin-stat-value">
            {clientsReady ? (
              clientCount
            ) : (
              <span className="admin-pill admin-pill-warn">Table not set up</span>
            )}
          </div>
          <div className="admin-stat-hint">
            {clientsReady
              ? unassigned > 0
                ? `${unassigned} without a day or team`
                : clientCount > 0
                  ? `All assigned a day and team${inactiveCount ? ` · ${inactiveCount} inactive` : ''}`
                  : 'Add your mowing clients to start planning routes'
              : 'Run the clients migration in Supabase'}
          </div>
        </Link>

        <FleetLocateCard config={fleetLocateConfig()} />

        <Link href="/admin/teams" className="admin-stat">
          <div className="admin-stat-label">Crews &amp; teams</div>
          <div className="admin-stat-value">
            {teamsReady ? (
              `${activeTeams.length} active`
            ) : (
              <span className="admin-pill admin-pill-warn">Table not set up</span>
            )}
          </div>
          <div className="admin-stat-hint">
            {teamsReady
              ? `${baggerTeams} with a bagger${teamsMissingLead ? ` · ${teamsMissingLead} missing a lead` : ''}`
              : 'Run the teams migration in Supabase'}
          </div>
        </Link>
      </div>

      <section className="admin-card">
        <h2 className="admin-card-title">Quick edits</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          <QuickLink href="/admin/home" label="Home page" hint="Hero, About, CTA" />
          <QuickLink href="/admin/services" label="Services" hint="The 4 seasonal cards" />
          <QuickLink href="/admin/contact" label="Contact page" hint="Headings + cards" />
          <QuickLink href="/admin/careers" label="Careers page" hint="Perks + positions" />
          <QuickLink href="/admin/estimate" label="Estimate page" hint="Benefits + heading" />
          <QuickLink href="/admin/settings" label="Site settings" hint="Phone, name, hours, social" />
          <QuickLink href="/admin/clients" label="Clients & routes" hint="Mowing schedule table" />
          <QuickLink href="/admin/teams" label="Crews & teams" hint="Leads, phones, baggers" />
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">Form submissions</h2>
        <p className="admin-card-desc" style={{ marginBottom: 0 }}>
          Estimate requests and job applications are emailed automatically
          {notifyTo ? ` to ${notifyTo}` : ''}. A copy is also kept in the database in case an
          email goes missing.
        </p>
      </section>
    </>
  );
}

function QuickLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link href={href} className="admin-quick">
      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{label}</div>
      <div style={{ color: 'var(--admin-text-dim)', fontSize: '0.78rem', marginTop: 2 }}>{hint}</div>
    </Link>
  );
}
