'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ClientRow, TeamRow } from '@/lib/supabase/content-types';
import ClientsTable from './ClientsTable';
import ClientsMap from './ClientsMap';

// Table / Map tabs share one rows state so unsaved edits show up on the map
// and geocoding results show up in the table.
export default function ClientsView({
  initial,
  teams,
  disabled,
  geoReady,
}: {
  initial: ClientRow[];
  teams: TeamRow[];
  disabled: boolean;
  geoReady: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get('view') === 'map' ? 'map' : 'table';
  const [rows, setRows] = useState<ClientRow[]>(initial);

  function go(v: 'table' | 'map') {
    router.replace(v === 'map' ? '/admin/clients?view=map' : '/admin/clients', { scroll: false });
  }

  const pinned = rows.filter((r) => r.active && r.lat != null).length;
  const activeCount = rows.filter((r) => r.active).length;

  return (
    <>
      <div className="admin-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={view === 'table'}
          className={`admin-tab${view === 'table' ? ' is-active' : ''}`}
          onClick={() => go('table')}
        >
          Table
        </button>
        <button
          role="tab"
          aria-selected={view === 'map'}
          className={`admin-tab${view === 'map' ? ' is-active' : ''}`}
          onClick={() => go('map')}
        >
          Map
          {activeCount > 0 && (
            <span className="admin-tab-count">
              {pinned}/{activeCount}
            </span>
          )}
        </button>
      </div>

      {view === 'table' ? (
        <ClientsTable initial={initial} rows={rows} setRows={setRows} teams={teams} disabled={disabled} />
      ) : (
        <ClientsMap rows={rows} setRows={setRows} teams={teams} disabled={disabled} geoReady={geoReady} />
      )}
    </>
  );
}
