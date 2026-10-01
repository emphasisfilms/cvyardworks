// Pull GPS data from Spireon into Supabase.
//
// Each run does three things, in order, inside a time budget:
//   1. Refresh the vehicle list and current positions.
//   2. Forward sync: fetch every event since each truck's cursor.
//      Backfill: walk backwards a day at a time until BACKFILL_DAYS ago.
//   3. Derive stops ("visits") from the events and match them to client pins
//      and the shop.
//
// Raw events are the source of truth; visits can always be rebuilt from them.

import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAssetEvents, fetchFleetAssets, type FleetEvent } from '@/lib/fleetlocate';
import { detectStops, haversineM, type StopEvent } from '@/lib/fleet-stops';

const PAGE = 100;
const MAX_PAGES = 40; // safety cap per window
const BACKFILL_DAYS = Number(process.env.FLEET_BACKFILL_DAYS ?? 120);
const CLIENT_RADIUS_M = 120; // a stop this close to a client pin counts as a visit
const MIN_STOP_MIN = 2;
const DAY_MS = 86400000;

export interface SyncResult {
  ok: boolean;
  skipped?: string;
  vehicles: number;
  events: number;
  backfillDays: number;
  backfillRemaining: number; // trucks still backfilling
  visits: number;
  ms: number;
  error?: string;
}

interface VehicleRow {
  id: string;
  last_event_at: string | null;
  backfill_day: string | null;
  backfill_done: boolean;
}

interface ShopLocation {
  lat: number;
  lng: number;
  radius_m: number;
}

const dayStr = (d: Date) => d.toISOString().slice(0, 10);

async function storeEvents(db: SupabaseClient, vehicleId: string, events: FleetEvent[]): Promise<void> {
  for (let i = 0; i < events.length; i += 500) {
    const rows = events.slice(i, i + 500).map((e) => ({
      id: e.id,
      vehicle_id: vehicleId,
      type: e.type,
      at: e.at,
      lat: e.lat,
      lng: e.lng,
      speed: e.speed,
      heading: e.heading,
      odometer: e.odometer,
      engine_hours: e.engineHours,
      address: e.address,
      data: e.data,
    }));
    const { error } = await db.from('cvy_gps_events').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(`Saving events: ${error.message}`);
  }
}

// Fetch and store every event for one truck in [startISO, endISO).
async function pullWindow(
  db: SupabaseClient,
  vehicleId: string,
  startISO: string,
  endISO: string | null
): Promise<{ stored: number; newest: string | null }> {
  let stored = 0;
  let newest: string | null = null;
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetchAssetEvents(vehicleId, startISO, endISO, PAGE, offset);
    if (res.events.length) {
      await storeEvents(db, vehicleId, res.events);
      stored += res.events.length;
      for (const e of res.events) if (!newest || e.at > newest) newest = e.at;
    }
    offset += res.count;
    if (res.count === 0 || offset >= res.total) break;
  }
  return { stored, newest };
}

// Rebuild a truck's stops whose arrival falls in [fromISO, toISO), matched to
// clients / the shop. Idempotent: existing visits in that window are replaced.
async function deriveVisits(
  db: SupabaseClient,
  vehicleId: string,
  fromISO: string,
  toISO: string,
  clients: { id: string; lat: number; lng: number }[],
  shop: ShopLocation | null
): Promise<number> {
  const live = new Date(toISO).getTime() > Date.now() - 3600000;
  // For a past window, read a few days further so a stop that began inside the
  // window can be closed by its real departure.
  const readTo = live ? toISO : new Date(new Date(toISO).getTime() + 5 * DAY_MS).toISOString();

  const events: StopEvent[] = [];
  for (let from = 0; from < 30000; from += 1000) {
    const { data, error } = await db
      .from('cvy_gps_events')
      .select('type, at, lat, lng, speed, address')
      .eq('vehicle_id', vehicleId)
      .gte('at', fromISO)
      .lt('at', readTo)
      .order('at')
      .range(from, from + 999);
    if (error) throw new Error(`Reading events: ${error.message}`);
    events.push(...((data ?? []) as StopEvent[]));
    if (!data || data.length < 1000) break;
  }
  if (events.length === 0) return 0;

  // A stop that began shortly before this window and is still open.
  const { data: openRows } = await db
    .from('cvy_visits')
    .select('arrived_at, lat, lng, address')
    .eq('vehicle_id', vehicleId)
    .is('departed_at', null)
    .lt('arrived_at', fromISO)
    .gte('arrived_at', new Date(new Date(fromISO).getTime() - 7 * DAY_MS).toISOString())
    .order('arrived_at', { ascending: false })
    .limit(1);
  const carried = openRows?.[0]
    ? { arrived: openRows[0].arrived_at as string, lat: openRows[0].lat as number | null, lng: openRows[0].lng as number | null, address: openRows[0].address as string | null }
    : null;

  const stops = detectStops(events, carried).filter((s) => s.carried || s.arrived < toISO);

  const rows = stops
    .map((s) => {
      const minutes = s.departed
        ? Math.round((new Date(s.departed).getTime() - new Date(s.arrived).getTime()) / 60000)
        : null;
      if (minutes !== null && minutes < MIN_STOP_MIN) return null;

      let kind: 'client' | 'shop' | 'other' = 'other';
      let clientId: string | null = null;
      if (s.lat != null && s.lng != null) {
        let best = CLIENT_RADIUS_M;
        for (const c of clients) {
          const d = haversineM(s.lat, s.lng, c.lat, c.lng);
          if (d <= best) {
            best = d;
            clientId = c.id; // nearest client inside the radius
          }
        }
        if (clientId) kind = 'client';
        else if (shop && haversineM(s.lat, s.lng, shop.lat, shop.lng) <= shop.radius_m) kind = 'shop';
      }
      return {
        vehicle_id: vehicleId,
        client_id: clientId,
        kind,
        arrived_at: s.arrived,
        departed_at: s.departed,
        minutes,
        lat: s.lat,
        lng: s.lng,
        address: s.address,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Replace what this window produced before, then write the fresh set.
  const { error: delErr } = await db
    .from('cvy_visits')
    .delete()
    .eq('vehicle_id', vehicleId)
    .gte('arrived_at', fromISO)
    .lt('arrived_at', toISO);
  if (delErr) throw new Error(`Clearing visits: ${delErr.message}`);

  if (rows.length === 0) return 0;
  const { error } = await db.from('cvy_visits').upsert(rows, { onConflict: 'vehicle_id,arrived_at' });
  if (error) throw new Error(`Saving visits: ${error.message}`);
  return rows.length;
}

export async function runFleetSync(
  db: SupabaseClient,
  opts: { source: 'cron' | 'manual'; budgetMs?: number; minIntervalSec?: number }
): Promise<SyncResult> {
  const t0 = Date.now();
  const budget = opts.budgetMs ?? 40000;
  const left = () => budget - (Date.now() - t0);
  const result: SyncResult = { ok: true, vehicles: 0, events: 0, backfillDays: 0, backfillRemaining: 0, visits: 0, ms: 0 };

  try {
    // Don't let the public endpoint be hammered.
    if (opts.minIntervalSec) {
      const { data: last } = await db
        .from('cvy_gps_sync_log')
        .select('ran_at')
        .order('ran_at', { ascending: false })
        .limit(1);
      if (last?.[0] && Date.now() - new Date(last[0].ran_at).getTime() < opts.minIntervalSec * 1000) {
        return { ...result, skipped: 'A sync ran moments ago.', ms: Date.now() - t0 };
      }
    }

    // 1. Vehicles and current positions. Only API-owned columns are written,
    //    so team, notes and cursors are never overwritten.
    const assets = await fetchFleetAssets();
    result.vehicles = assets.length;
    if (assets.length) {
      const { error } = await db.from('cvy_vehicles').upsert(
        assets.map((a) => ({
          id: a.id,
          name: a.name,
          vin: a.vin,
          make: a.vehicle.split(' ')[1] ?? null,
          model: a.vehicle.split(' ').slice(2).join(' ') || null,
          year: a.vehicle.split(' ')[0] ?? null,
          status: a.status,
          speed: a.speed,
          lat: a.lat,
          lng: a.lng,
          address: a.address,
          last_reported: a.lastReported,
          odometer: a.odometer,
          engine_hours: a.engineHours,
        })),
        { onConflict: 'id' }
      );
      if (error) throw new Error(`Saving vehicles: ${error.message}`);
    }

    const { data: vrows, error: vErr } = await db
      .from('cvy_vehicles')
      .select('id, last_event_at, backfill_day, backfill_done')
      .eq('active', true);
    if (vErr) throw new Error(`Reading vehicles: ${vErr.message}`);
    const vehicles = (vrows ?? []) as VehicleRow[];

    // What stops get matched against.
    const [{ data: clientRows }, { data: shopRow }] = await Promise.all([
      db.from('cvy_clients').select('id, lat, lng').not('lat', 'is', null),
      db.from('cvy_site_content').select('value').eq('key', 'shop_location').maybeSingle(),
    ]);
    const clients = (clientRows ?? []) as { id: string; lat: number; lng: number }[];
    const shop = (shopRow?.value ?? null) as ShopLocation | null;

    // Windows whose visits need (re)deriving: vehicle id -> [from, to]
    const touched = new Map<string, { from: string; to: string }>();
    const touch = (id: string, from: string, to: string) => {
      const cur = touched.get(id);
      touched.set(id, cur ? { from: from < cur.from ? from : cur.from, to: to > cur.to ? to : cur.to } : { from, to });
    };

    // 2a. Forward sync.
    const nowISO = new Date().toISOString();
    for (const v of vehicles) {
      if (left() < 8000) break;
      const start = v.last_event_at ?? new Date(Date.now() - DAY_MS).toISOString();
      const { stored, newest } = await pullWindow(db, v.id, start, null);
      result.events += stored;
      if (newest && newest !== v.last_event_at) {
        await db.from('cvy_vehicles').update({ last_event_at: newest }).eq('id', v.id);
      }
      if (stored) touch(v.id, new Date(new Date(start).getTime() - DAY_MS).toISOString(), nowISO);
    }

    // 2b. Backfill, one day per truck per pass, newest days first.
    const floor = dayStr(new Date(Date.now() - BACKFILL_DAYS * DAY_MS));
    const pending = vehicles.filter((v) => !v.backfill_done);
    const cursor = new Map(pending.map((v) => [v.id, v.backfill_day ?? dayStr(new Date(Date.now() - DAY_MS))]));
    let progressed = true;
    while (progressed && left() > 9000) {
      progressed = false;
      for (const v of pending) {
        if (left() < 9000) break;
        const day = cursor.get(v.id)!;
        if (day < floor) continue;
        const startISO = `${day}T00:00:00Z`;
        const endISO = new Date(new Date(startISO).getTime() + DAY_MS).toISOString();
        const { stored } = await pullWindow(db, v.id, startISO, endISO);
        result.events += stored;
        result.backfillDays += 1;
        const prev = dayStr(new Date(new Date(startISO).getTime() - DAY_MS));
        cursor.set(v.id, prev);
        const done = prev < floor;
        await db.from('cvy_vehicles').update({ backfill_day: prev, backfill_done: done }).eq('id', v.id);
        if (stored) touch(v.id, new Date(new Date(startISO).getTime() - DAY_MS).toISOString(), new Date(new Date(endISO).getTime() + DAY_MS).toISOString());
        progressed = true;
      }
    }
    result.backfillRemaining = pending.filter((v) => (cursor.get(v.id) ?? '') >= floor).length;

    // 3. Visits for everything touched.
    for (const [id, w] of touched) {
      if (left() < 1500) break;
      result.visits += await deriveVisits(db, id, w.from, w.to, clients, shop);
    }
  } catch (e) {
    result.ok = false;
    result.error = (e as Error).message;
  }

  result.ms = Date.now() - t0;
  await db.from('cvy_gps_sync_log').insert({
    source: opts.source,
    vehicles: result.vehicles,
    events: result.events,
    backfill_days: result.backfillDays,
    visits: result.visits,
    ms: result.ms,
    error: result.error ?? null,
  });
  return result;
}
