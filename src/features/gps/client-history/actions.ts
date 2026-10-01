'use server';

// FEATURE: client-history — service history shown when a client pin is clicked.
// Remove: delete this folder and the two `feature: client-history` lines in MapGpsTools.tsx.

import { signedInClient } from '../auth';

export interface ClientHistory {
  visits: number;
  avgMinutes: number | null;
  last: { at: string; minutes: number | null; truck: string; shared: number }[]; // newest first
}

interface Row {
  id: string;
  vehicle_id: string;
  arrived_at: string;
  minutes: number | null;
  client_id: string | null;
  clients: { id: string; min: number | null }[] | null;
}

export async function getClientHistoryAction(
  clientId: string
): Promise<{ ok: true; history: ClientHistory } | { ok: false; error: string }> {
  const db = await signedInClient();
  if (!db) return { ok: false, error: 'Not signed in' };

  // A client can be the nearest pin (client_id) or one of several served from
  // the same parking spot (the clients list).
  const [primary, shared, vehicles] = await Promise.all([
    db.from('cvy_visits').select('*').eq('client_id', clientId).order('arrived_at', { ascending: false }).limit(300),
    db.from('cvy_visits').select('*').contains('clients', JSON.stringify([{ id: clientId }])).order('arrived_at', { ascending: false }).limit(300),
    db.from('cvy_vehicles').select('id, name'),
  ]);
  if (primary.error) return { ok: false, error: primary.error.message };

  const byId = new Map<string, Row>();
  for (const r of [...(primary.data ?? []), ...(shared.data ?? [])] as Row[]) byId.set(r.id, r);
  const rows = Array.from(byId.values()).sort((a, b) => (a.arrived_at < b.arrived_at ? 1 : -1));
  const truck = new Map((vehicles.data ?? []).map((v) => [v.id as string, v.name as string]));

  // This client's share of each stop when the stop served several clients.
  const mine = (r: Row) => r.clients?.find((c) => c.id === clientId)?.min ?? r.minutes;
  const timed = rows.map(mine).filter((m): m is number => typeof m === 'number' && m > 0);

  return {
    ok: true,
    history: {
      visits: rows.length,
      avgMinutes: timed.length ? Math.round(timed.reduce((a, b) => a + b, 0) / timed.length) : null,
      last: rows.slice(0, 5).map((r) => ({
        at: r.arrived_at,
        minutes: mine(r),
        truck: truck.get(r.vehicle_id) ?? 'Truck',
        shared: r.clients?.length ?? 1,
      })),
    },
  };
}
