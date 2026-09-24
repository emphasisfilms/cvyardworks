import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TeamRow } from '@/lib/supabase/content-types';
import TeamsTable from './TeamsTable';

export const dynamic = 'force-dynamic';

export default async function AdminTeamsPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, clients] = await Promise.all([
    supabase.from('cvy_teams').select('*').order('number'),
    supabase.from('cvy_clients').select('current_team, service_minutes, bagged'),
  ]);

  const missingTable = error?.code === '42P01';

  // Per-team client counts so the table can show how loaded each crew is.
  const load = new Map<string, { n: number; mins: number; bagged: number }>();
  for (const c of clients.data ?? []) {
    if (!c.current_team) continue;
    const e = load.get(c.current_team) ?? { n: 0, mins: 0, bagged: 0 };
    e.n += 1;
    e.mins += c.service_minutes ?? 0;
    if (c.bagged) e.bagged += 1;
    load.set(c.current_team, e);
  }

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Crews &amp; Teams</h1>
          <p className="admin-page-subtitle">
            One row per crew. This list drives the Current team dropdown on Clients &amp; Routes.
            Teams with a bagger can take properties marked Bagged.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-notice">
          {missingTable ? (
            <>
              The teams table has not been created yet. In the Supabase SQL Editor run{' '}
              <code>supabase/migrations/005_teams.sql</code> once, then reload this page.
            </>
          ) : (
            <>Couldn’t load teams: {error.message}</>
          )}
        </div>
      )}

      <TeamsTable
        initial={(data ?? []) as TeamRow[]}
        load={Object.fromEntries(load)}
        disabled={!!error}
      />
    </>
  );
}
