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
import type { FleetPlace } from '@/lib/fleet-places';

const PAGE = 100;
const MAX_PAGES = 40; // safety cap per window
const BACKFILL_DAYS = Number(process.env.FLEET_BACKFILL_DAYS ?? 120);
// Crews often park in one spot and service several neighbouring clients on
// foot, so a stop is linked to every client pin within this distance.
const CLIENT_RADIUS_M = 250;
const MIN_STOP_MIN = 3; // shorter dwells are traffic, not stops
const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/New_York' });
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
  team: string | null;
  last_event_at: string | null;
  backfill_day: string | null;
  backfill_done: boolean;
}

interface ShopLocation {
  lat: number;
  lng: number;
  radius_m: number;
  match?: string; // any stop whose address contains this is the shop (e.g. "Levi L")
}

interface MatchClient {
  id: string;
  lat: number;
  lng: number;
  minutes: number | null; // estimated service time, used to share a stop's time
  day: string | null;
  team: string | null;
}

export interface VisitClient {
  id: string;
  m: number; // metres from where the truck parked
  min: number | null; // this client's share of the stop, in minutes
}

async function loadMatchContext(
  db: SupabaseClient
): Promise<{ clients: MatchClient[]; shop: ShopLocation | null; places: FleetPlace[] }> {
  const [{ data: clientRows }, { data: shopRow }, { data: placesRow }] = await Promise.all([
    db.from('cvy_clients').select('*').not('lat', 'is', null),
    db.from('cvy_site_content').select('value').eq('key', 'shop_location').maybeSingle(),
    db.from('cvy_site_content').select('value').eq('key', 'gps_places').maybeSingle(),
  ]);
  const places = (Array.isArray(placesRow?.value) ? placesRow.value : []) as FleetPlace[];
  const clients: MatchClient[] = (clientRows ?? [])
    .filter((c) => c.active !== false && typeof c.lat === 'number' && typeof c.lng === 'number')
    .map((c) => ({
      id: c.id as string,
      lat: c.lat as number,
      lng: c.lng as number,
      minutes: typeof c.service_minutes === 'number' ? c.service_minutes : null,
      day: (c.current_day as string | null) ?? null,
      team: (c.current_team as string | null) ?? null,
    }));
  return { clients, shop: (shopRow?.value ?? null) as ShopLocation | null, places };
}

// Which clients a stop at (lat, lng) most plausibly served, and how its time
// divides between them.
function matchClients(
  lat: number,
  lng: number,
  arrivedISO: string,
  minutes: number | null,
  clients: MatchClient[],
  vehicleTeam: string | null
): VisitClient[] {
  const near = clients
    .map((c) => ({ c, m: haversineM(lat, lng, c.lat, c.lng) }))
    .filter((x) => x.m <= CLIENT_RADIUS_M)
    .sort((a, b) => a.m - b.m);
  if (near.length === 0) return [];

  // If the schedule says some of them are due that weekday (for this truck's
  // team, when known), those are the ones being serviced.
  const weekday = WEEKDAY.format(new Date(arrivedISO));
  const due = near.filter(
    (x) => x.c.day === weekday && (!vehicleTeam || !x.c.team || x.c.team === vehicleTeam)
  );
  const pool = due.length ? due : near;

  // Share the stop's time by estimated service time when every client has one,
  // otherwise evenly.
  const allEstimated = pool.every((x) => (x.c.minutes ?? 0) > 0);
  const totalWeight = allEstimated ? pool.reduce((t, x) => t + (x.c.minutes as number), 0) : pool.length;
  return pool.map((x) => ({
    id: x.c.id,
    m: Math.round(x.m),
    min:
      minutes == null
        ? null
        : Math.round((minutes * (allEstimated ? (x.c.minutes as number) : 1)) / totalWeight),
  }));
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
  clients: MatchClient[],
  shop: ShopLocation | null,
  places: FleetPlace[],
  vehicleTeam: string | null
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

      let kind: string = 'other'; // client | shop | other | a place kind such as "dump"
      let clientId: string | null = null;
      let served: VisitClient[] = [];
      const atShop =
        !!shop &&
        ((!!shop.match && !!s.address && s.address.toLowerCase().includes(shop.match.toLowerCase())) ||
          (s.lat != null && s.lng != null && haversineM(s.lat, s.lng, shop.lat, shop.lng) <= shop.radius_m));
      const place =
        s.lat != null && s.lng != null
          ? places.find((p) => haversineM(s.lat as number, s.lng as number, p.lat, p.lng) <= p.radius_m)
          : undefined;
      if (atShop) {
        kind = 'shop';
      } else if (place) {
        kind = place.kind; // e.g. the debris landing
      } else if (s.lat != null && s.lng != null) {
        served = matchClients(s.lat, s.lng, s.arrived, minutes, clients, vehicleTeam);
        if (served.length) {
          kind = 'client';
          clientId = served[0].id; // nearest; the full list is in `clients`
        }
      }
      return {
        vehicle_id: vehicleId,
        client_id: clientId,
        clients: served.length ? served : null,
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
  let { error } = await db.from('cvy_visits').upsert(rows, { onConflict: 'vehicle_id,arrived_at' });
  if (error && /clients/.test(error.message)) {
    // Migration 012 not run yet: save without the multi-client list rather than fail.
    const plain = rows.map((r) => {
      const copy: Record<string, unknown> = { ...r };
      delete copy.clients;
      return copy;
    });
    ({ error } = await db.from('cvy_visits').upsert(plain, { onConflict: 'vehicle_id,arrived_at' }));
  }
  if (error) throw new Error(`Saving visits: ${error.message}`);
  return rows.length;
}

export interface RebuildCursor {
  i: number; // vehicle index
  from: string | null; // next window start for that vehicle
}

// Re-derive every stop from the stored events, a week at a time, within a
// time budget. Call repeatedly with the returned cursor until it is null.
export async function rebuildVisitsChunk(
  db: SupabaseClient,
  cursor: RebuildCursor | null,
  budgetMs: number
): Promise<{ next: RebuildCursor | null; visits: number; vehicles: number; error?: string }> {
  const t0 = Date.now();
  let visits = 0;
  try {
    const { data: vrows, error } = await db.from('cvy_vehicles').select('id, team').order('id');
    if (error) throw new Error(error.message);
    const vehicles = vrows ?? [];
    const { clients, shop, places } = await loadMatchContext(db);
    let i = cursor?.i ?? 0;
    let from = cursor?.from ?? null;
    while (i < vehicles.length) {
      const v = vehicles[i];
      if (!from) {
        const { data: first } = await db
          .from('cvy_gps_events')
          .select('at')
          .eq('vehicle_id', v.id)
          .order('at')
          .limit(1);
        if (!first?.[0]) { i += 1; continue; }
        from = `${(first[0].at as string).slice(0, 10)}T00:00:00.000Z`;
      }
      while (new Date(from).getTime() < Date.now()) {
        if (Date.now() - t0 > budgetMs) return { next: { i, from }, visits, vehicles: vehicles.length };
        const to = new Date(new Date(from).getTime() + 7 * DAY_MS).toISOString();
        visits += await deriveVisits(db, v.id as string, from, to, clients, shop, places, (v.team as string | null) ?? null);
        from = to;
      }
      i += 1;
      from = null;
    }
    return { next: null, visits, vehicles: vehicles.length };
  } catch (e) {
    return { next: cursor, visits, vehicles: 0, error: (e as Error).message };
  }
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
      .select('id, team, last_event_at, backfill_day, backfill_done')
      .eq('active', true);
    if (vErr) throw new Error(`Reading vehicles: ${vErr.message}`);
    const vehicles = (vrows ?? []) as VehicleRow[];

    // What stops get matched against.
    const { clients, shop, places } = await loadMatchContext(db);
    const teamOf = new Map(vehicles.map((v) => [v.id, v.team]));

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
      result.visits += await deriveVisits(db, id, w.from, w.to, clients, shop, places, teamOf.get(id) ?? null);
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
