// FEATURE: status-board — "who is where right now" for the office.
// Remove: delete this folder and the `feature: status-board` lines in
// src/app/admin/(authed)/fleet/page.tsx.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface StatusRow {
  id: string;
  name: string;
  team: string | null;
  status: string; // Moving | Idle | Stopped | Unknown
  speed: number | null;
  address: string | null;
  lastReported: string | null;
  // Set when the truck is parked somewhere we recognise.
  place: { kind: string; label: string; since: string } | null;
}

export interface StatusBoardData {
  rows: StatusRow[];
  asOf: string; // when this snapshot was taken; "for 22 min" is measured from here
}

export async function loadStatusBoard(db: SupabaseClient): Promise<StatusBoardData> {
  return { rows: await loadRows(db), asOf: new Date().toISOString() };
}

async function loadRows(db: SupabaseClient): Promise<StatusRow[]> {
  const [vehicles, open] = await Promise.all([
    db.from('cvy_vehicles').select('*').eq('active', true).order('name'),
    db.from('cvy_visits').select('*').is('departed_at', null).order('arrived_at', { ascending: false }).limit(200),
  ]);
  if (vehicles.error) return [];

  // The newest still-open stop per truck.
  const openBy = new Map<string, NonNullable<typeof open.data>[number]>();
  for (const v of open.data ?? []) if (!openBy.has(v.vehicle_id)) openBy.set(v.vehicle_id, v);

  const ids = Array.from(
    new Set(
      Array.from(openBy.values()).flatMap((v) =>
        Array.isArray(v.clients) && v.clients.length
          ? (v.clients as { id: string }[]).map((c) => c.id)
          : v.client_id
            ? [v.client_id as string]
            : []
      )
    )
  );
  const { data: clients } = ids.length
    ? await db.from('cvy_clients').select('id, name').in('id', ids)
    : { data: [] as { id: string; name: string }[] };
  const nameOf = new Map((clients ?? []).map((c) => [c.id, c.name]));

  return (vehicles.data ?? []).map((v) => {
    const stop = v.status === 'Moving' ? undefined : openBy.get(v.id);
    let place: StatusRow['place'] = null;
    if (stop) {
      const served: string[] =
        Array.isArray(stop.clients) && stop.clients.length
          ? (stop.clients as { id: string }[]).map((c) => nameOf.get(c.id) ?? 'Client')
          : stop.client_id
            ? [nameOf.get(stop.client_id) ?? 'Client']
            : [];
      place = {
        kind: stop.kind,
        label: stop.kind === 'shop' ? 'the shop' : served.length ? served.join(', ') : stop.address ?? 'an unknown stop',
        since: stop.arrived_at,
      };
    }
    return {
      id: v.id,
      name: v.name,
      team: v.team ?? null,
      status: v.status ?? 'Unknown',
      speed: v.speed ?? null,
      address: v.address ?? null,
      lastReported: v.last_reported ?? null,
      place,
    };
  });
}
