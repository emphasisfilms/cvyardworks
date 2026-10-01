'use client';

import { useState } from 'react';
import type { ClientRow, TeamRow } from '@/lib/supabase/content-types';
import ClientsTable from './ClientsTable';

// Holds the rows for the editable table. (The map lives on its own page now.)
export default function ClientsView({
  initial,
  teams,
  disabled,
}: {
  initial: ClientRow[];
  teams: TeamRow[];
  disabled: boolean;
}) {
  const [rows, setRows] = useState<ClientRow[]>(initial);
  return <ClientsTable initial={initial} rows={rows} setRows={setRows} teams={teams} disabled={disabled} />;
}
