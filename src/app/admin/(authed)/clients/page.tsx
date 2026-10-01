import Link from 'next/link';
import { redirect } from 'next/navigation';
import ClientsView from './ClientsView';
import { loadClientsAndTeams } from './load';

export const dynamic = 'force-dynamic';

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  // The map used to be a tab here; keep old links working.
  if ((await searchParams).view === 'map') redirect('/admin/map');

  const { clients, teams, error, teamsError } = await loadClientsAndTeams();

  // 42P01 = table does not exist; 42703 = a column is missing.
  const missingTable = error?.code === '42P01';
  const missingColumn = error?.code === '42703';
  const missingWhich = '002_clients.sql through 009_clients_sander.sql (each is safe to re-run)';

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Clients &amp; Routes</h1>
          <p className="admin-page-subtitle">
            One row per property. Fill in the whole table, then we can optimize which crew
            mows which stops on which day. See them on the <Link href="/admin/map">Map</Link>.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-notice">
          {missingTable ? (
            <>
              The clients table has not been created yet. Open the Supabase SQL Editor for the
              shared project and run <code>supabase/migrations/002_clients.sql</code> from the
              cvyardworks repo once, then reload this page.
            </>
          ) : missingColumn ? (
            <>
              The table is missing a column. In the Supabase SQL Editor run{' '}
              <code>supabase/migrations/{missingWhich}</code>, then reload this page.
            </>
          ) : (
            <>Couldn’t load clients: {error.message}</>
          )}
        </div>
      )}

      {teamsError && (
        <div className="admin-notice">
          Teams are not set up yet, so the dropdown shows Teams 1–6. Run{' '}
          <code>supabase/migrations/005_teams.sql</code> in the Supabase SQL Editor to manage
          crews on the Crews &amp; Teams tab.
        </div>
      )}

      <ClientsView initial={clients} teams={teams} disabled={!!error} />
    </>
  );
}
