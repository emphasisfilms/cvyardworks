'use client';

import { useState } from 'react';
import type { ClientRow, TeamRow } from '@/lib/supabase/content-types';
import ClientsMap from '../clients/ClientsMap';
import MapGpsTools from '@/features/gps/MapGpsTools';

export default function MapView({
  initial,
  teams,
  disabled,
  geoReady,
  fleetReady,
}: {
  initial: ClientRow[];
  teams: TeamRow[];
  disabled: boolean;
  geoReady: boolean;
  fleetReady: boolean;
}) {
  const [rows, setRows] = useState<ClientRow[]>(initial);
  return (
    <ClientsMap
      rows={rows}
      setRows={setRows}
      teams={teams}
      disabled={disabled}
      geoReady={geoReady}
      fleetReady={fleetReady}
      extras={(ctx) => <MapGpsTools ctx={ctx} />}
    />
  );
}
