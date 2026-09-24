import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ClientRow, TeamRow } from '@/lib/supabase/content-types';
import ClientsTable from './ClientsTable';

export const dynamic = 'force-dynamic';

export default async function AdminClientsPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, teamsRes] = await Promise.all([
    supabase
      .from('cvy_clients')
      .select(
        'id, name, address, service_minutes, required_day, current_day, current_team, team_required, bagged, notes, sort_order'
      )
      .order('sort_order')
      .order('name'),
    supabase.from('cvy_teams').select('*').order('number'),
  ]);

  // Until the teams migration is run, fall back to the original six numbered teams.
  const teams: TeamRow[] =
    !teamsRes.error && teamsRes.data && teamsRes.data.length > 0
      ? (teamsRes.data as TeamRow[])
      : [1, 2, 3, 4, 5, 6].map((n) => ({
          id: String(n),
          number: n,
          name: '',
          lead_name: '',
          lead_phone: '',
          has_bagger: true,
          active: true,
          notes: null,
        }));

  // 42P01 = table does not exist (migration 002 not run);
  // 42703 = column does not exist (migration 003 not run).
  const missingTable = error?.code === '42P01';
  const missingColumn = error?.code === '42703' || /team_required|bagged/.test(error?.message ?? '');
  const missingWhich = /bagged/.test(error?.message ?? '')
    ? '004_clients_bagged.sql'
    : '003_clients_team_required.sql';

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Clients &amp; Routes</h1>
          <p className="admin-page-subtitle">
            One row per property. Fill in the whole table, then we can optimize which crew
            mows which stops on which day.
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
              The table needs one more column. In the Supabase SQL Editor run{' '}
              <code>supabase/migrations/{missingWhich}</code> once, then reload this page.
            </>
          ) : (
            <>Couldn’t load clients: {error.message}</>
          )}
        </div>
      )}

      {teamsRes.error && (
        <div className="admin-notice">
          Teams are not set up yet, so the dropdown shows Teams 1–6. Run{' '}
          <code>supabase/migrations/005_teams.sql</code> in the Supabase SQL Editor to manage
          crews on the Crews &amp; Teams tab.
        </div>
      )}

      <ClientsTable initial={(data ?? []) as ClientRow[]} teams={teams} disabled={!!error} />
    </>
  );
}
