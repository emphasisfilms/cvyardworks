'use server';

// FEATURE: trails — where each truck has driven so far today.
// Remove: delete this folder and the two `feature: trails` lines in MapGpsTools.tsx.

import { signedInClient } from '../auth';
import { etDayRangeUTC, etToday, haversineM } from '../shared';

export interface Trail {
  id: string;
  name: string;
  team: string | null;
  points: [number, number][];
}

export async function getTrailsAction(): Promise<{ ok: true; trails: Trail[] } | { ok: false; error: string }> {
  const db = await signedInClient();
  if (!db) return { ok: false, error: 'Not signed in' };

  const { from, to } = etDayRangeUTC(etToday());
  const { data: vehicles, error: vErr } = await db.from('cvy_vehicles').select('id, name, team');
  if (vErr) return { ok: false, error: vErr.message };

  // Today's located events, oldest first (page past the 1000-row default).
  const byVehicle = new Map<string, [number, number][]>();
  for (let off = 0; off < 20000; off += 1000) {
    const { data, error } = await db
      .from('cvy_gps_events')
      .select('vehicle_id, lat, lng')
      .gte('at', from)
      .lt('at', to)
      .not('lat', 'is', null)
      .order('at')
      .range(off, off + 999);
    if (error) return { ok: false, error: error.message };
    for (const e of data ?? []) {
      const pts = byVehicle.get(e.vehicle_id) ?? [];
      const last = pts[pts.length - 1];
      // Skip points that barely moved, to keep the line light.
      if (!last || haversineM(last[0], last[1], e.lat, e.lng) > 30) pts.push([e.lat, e.lng]);
      byVehicle.set(e.vehicle_id, pts);
    }
    if (!data || data.length < 1000) break;
  }

  const trails = (vehicles ?? [])
    .map((v) => ({ id: v.id as string, name: v.name as string, team: (v.team as string | null) ?? null, points: byVehicle.get(v.id) ?? [] }))
    .filter((t) => t.points.length > 1);
  return { ok: true, trails };
}
