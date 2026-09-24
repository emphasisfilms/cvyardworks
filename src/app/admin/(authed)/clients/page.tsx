import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ClientRow } from '@/lib/supabase/content-types';
import ClientsTable from './ClientsTable';

export const dynamic = 'force-dynamic';

export default async function AdminClientsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cvy_clients')
    .select('*')
    .order('sort_order')
    .order('name');

  // 42P01 = table does not exist: the migration has not been run yet.
  const missingTable = error?.code === '42P01' || /cvy_clients/.test(error?.message ?? '');

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
          ) : (
            <>Couldn’t load clients: {error.message}</>
          )}
        </div>
      )}

      <ClientsTable initial={(data ?? []) as ClientRow[]} disabled={!!error} />
    </>
  );
}
