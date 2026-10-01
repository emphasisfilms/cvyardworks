'use server';

// FEATURE: scorecard — one line per truck summarising a day.
// Remove: delete this folder and the `feature: scorecard` lines in
// src/app/admin/(authed)/fleet/page.tsx.

import { signedInClient } from '../auth';
import { etDayRangeUTC } from '../shared';

export interface ScoreRow {
  id: string;
  name: string;
  team: string | null;
  leftShop: string | null;
  backAtShop: string | null;
  miles: number | null;
  stops: number; // stops away from the shop
  clientStops: number;
  onSiteMin: number; // parked away from the shop
  drivingMin: number;
  idleMin: number; // engine running while parked
}

export async function getScorecardAction(
  day: string
): Promise<{ ok: true; rows: ScoreRow[] } | { ok: false; error: string }> {
  const db = await signedInClient();
  if (!db) return { ok: false, error: 'Not signed in' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: 'Pick a date' };
  const { from, to } = etDayRangeUTC(day);

  const { data: vehicles, error: vErr } = await db.from('cvy_vehicles').select('id, name, team').eq('active', true).order('name');
  if (vErr) return { ok: false, error: vErr.message };

  // The day's events for every truck (types, speed, odometer).
  type Ev = { vehicle_id: string; type: string; at: string; speed: number | null; odometer: number | null };
  const events: Ev[] = [];
  for (let off = 0; off < 40000; off += 1000) {
    const { data, error } = await db
      .from('cvy_gps_events')
      .select('vehicle_id, type, at, speed, odometer')
      .gte('at', from)
      .lt('at', to)
      .order('at')
      .range(off, off + 999);
    if (error) return { ok: false, error: error.message };
    events.push(...((data ?? []) as Ev[]));
    if (!data || data.length < 1000) break;
  }

  // Stops that touch the day (arrived during it, or still open from before).
  const { data: visits, error: sErr } = await db
    .from('cvy_visits')
    .select('vehicle_id, kind, arrived_at, departed_at, minutes')
    .lt('arrived_at', to)
    .or(`departed_at.gte.${from},departed_at.is.null`)
    .order('arrived_at')
    .limit(2000);
  if (sErr) return { ok: false, error: sErr.message };

  const dayStart = new Date(from).getTime();
  const dayEnd = Math.min(new Date(to).getTime(), Date.now());

  const rows: ScoreRow[] = (vehicles ?? []).map((v) => {
    const ev = events.filter((e) => e.vehicle_id === v.id);
    const vs = (visits ?? []).filter((s) => s.vehicle_id === v.id);

    const odo = ev.map((e) => e.odometer).filter((o): o is number => typeof o === 'number' && o > 0);
    const miles = odo.length > 1 ? Math.max(0, Math.max(...odo) - Math.min(...odo)) : null;

    // Pings arrive every ~30 s while moving and every ~5 min while idling.
    const drivingMin = Math.round(ev.filter((e) => e.type === 'MOVE_PER' && (e.speed ?? 0) > 0).length * 0.5);
    const idleMin = ev.filter((e) => e.type === 'IDLE_PER').length * 5;

    // Only the part of each stop that falls inside this day counts.
    const within = (s: { arrived_at: string; departed_at: string | null }) => {
      const a = Math.max(dayStart, new Date(s.arrived_at).getTime());
      const d = Math.min(dayEnd, s.departed_at ? new Date(s.departed_at).getTime() : dayEnd);
      return Math.max(0, Math.round((d - a) / 60000));
    };
    const away = vs.filter((s) => s.kind !== 'shop' && new Date(s.arrived_at).getTime() >= dayStart);
    const shop = vs.filter((s) => s.kind === 'shop');
    const left = shop.find((s) => s.departed_at && new Date(s.departed_at).getTime() >= dayStart);
    const back = [...shop].reverse().find((s) => new Date(s.arrived_at).getTime() >= dayStart && (!left || s.arrived_at > left.departed_at!));

    return {
      id: v.id,
      name: v.name,
      team: v.team ?? null,
      leftShop: left?.departed_at ?? null,
      backAtShop: back?.arrived_at ?? null,
      miles: miles != null ? Math.round(miles * 10) / 10 : null,
      stops: away.length,
      clientStops: away.filter((s) => s.kind === 'client').length,
      onSiteMin: away.reduce((t, s) => t + within(s), 0),
      drivingMin,
      idleMin,
    };
  });

  return { ok: true, rows };
}
