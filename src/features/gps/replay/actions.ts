'use server';

// FEATURE: replay — play back one truck's day on the map.
// Remove: delete this folder and the two `feature: replay` lines in MapGpsTools.tsx.

import { signedInClient } from '../auth';
import { etDayRangeUTC } from '../shared';

export interface ReplayPoint {
  t: number; // epoch ms
  lat: number;
  lng: number;
  speed: number | null;
}

export interface ReplayStop {
  arrived: string;
  departed: string | null;
  minutes: number | null;
  lat: number;
  lng: number;
  kind: string;
  label: string;
}

export interface ReplayData {
  points: ReplayPoint[];
  stops: ReplayStop[];
}

export async function listReplayVehiclesAction(): Promise<{ id: string; name: string }[]> {
  const db = await signedInClient();
  if (!db) return [];
  const { data } = await db.from('cvy_vehicles').select('id, name').order('name');
  return (data ?? []) as { id: string; name: string }[];
}

export async function getReplayAction(
  vehicleId: string,
  day: string // YYYY-MM-DD, Eastern
): Promise<{ ok: true; data: ReplayData } | { ok: false; error: string }> {
  const db = await signedInClient();
  if (!db) return { ok: false, error: 'Not signed in' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: 'Pick a date' };
  const { from, to } = etDayRangeUTC(day);

  const points: ReplayPoint[] = [];
  for (let off = 0; off < 8000; off += 1000) {
    const { data, error } = await db
      .from('cvy_gps_events')
      .select('at, lat, lng, speed')
      .eq('vehicle_id', vehicleId)
      .gte('at', from)
      .lt('at', to)
      .not('lat', 'is', null)
      .order('at')
      .range(off, off + 999);
    if (error) return { ok: false, error: error.message };
    for (const e of data ?? []) points.push({ t: new Date(e.at).getTime(), lat: e.lat, lng: e.lng, speed: e.speed });
    if (!data || data.length < 1000) break;
  }

  const { data: visits, error: vErr } = await db
    .from('cvy_visits')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .gte('arrived_at', from)
    .lt('arrived_at', to)
    .not('lat', 'is', null)
    .order('arrived_at');
  if (vErr) return { ok: false, error: vErr.message };

  // Client names for the stop labels.
  const ids = Array.from(
    new Set(
      (visits ?? []).flatMap((v) =>
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

  const stops: ReplayStop[] = (visits ?? []).map((v) => {
    const served: string[] =
      Array.isArray(v.clients) && v.clients.length
        ? (v.clients as { id: string }[]).map((c) => nameOf.get(c.id) ?? 'Client')
        : v.client_id
          ? [nameOf.get(v.client_id) ?? 'Client']
          : [];
    return {
      arrived: v.arrived_at,
      departed: v.departed_at,
      minutes: v.minutes,
      lat: v.lat,
      lng: v.lng,
      kind: v.kind,
      label: v.kind === 'shop' ? 'Shop' : served.length ? served.join(', ') : v.address ?? 'Stop',
    };
  });

  return { ok: true, data: { points, stops } };
}
