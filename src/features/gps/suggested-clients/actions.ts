'use server';

// FEATURE: suggested-clients — places trucks keep stopping that are not in the
// client table yet, offered as one-click new clients.
// Remove: delete this folder and the `feature: suggested-clients` lines in
// src/app/admin/(authed)/clients/ClientsView.tsx. Dismissed places are kept in
// cvy_site_content under the key `gps_dismissed_places` (safe to delete).

import { signedInClient } from '../auth';
import { clusterPoints, etToday, etWeekday, haversineM, median, mode } from '../shared';
import { CLIENT_DAYS, type ClientDay, type ClientRow } from '@/lib/supabase/content-types';
import type { Suggestion } from './types';

const CLUSTER_M = 100; // stops this close together are the same place
const MIN_STOPS = 3;
const MIN_DAYS = 3;
const NEAR_CLIENT_M = 250; // already covered by an existing client pin
const DISMISS_M = 150;
// What a real client looks like in the GPS history (tuned on this fleet's data):
// a visit of at least 15 minutes, no more than a few days a week. Places the
// whole fleet drops into briefly, most days, are fuel / coffee / supplies.
const LIKELY_MIN_MINUTES = 15;
const LIKELY_MAX_DAYS_PER_WEEK = 2.5;

interface Dismissed {
  lat: number;
  lng: number;
  label: string;
}

export async function getSuggestionsAction(): Promise<
  { ok: true; suggestions: Suggestion[]; total: number; likelyTotal: number } | { ok: false; error: string }
> {
  const db = await signedInClient();
  if (!db) return { ok: false, error: 'Not signed in' };

  // Finished stops that matched neither a client nor the shop. Very long ones
  // are overnight parking, not service.
  type Stop = { id: string; vehicle_id: string; lat: number; lng: number; minutes: number; arrived_at: string; address: string | null };
  const stops: Stop[] = [];
  for (let off = 0; off < 30000; off += 1000) {
    const { data, error } = await db
      .from('cvy_visits')
      .select('id, vehicle_id, lat, lng, minutes, arrived_at, address')
      .eq('kind', 'other')
      .not('lat', 'is', null)
      .gte('minutes', 5)
      .lte('minutes', 600)
      .order('arrived_at')
      .range(off, off + 999);
    if (error) return { ok: false, error: error.message };
    stops.push(...((data ?? []) as Stop[]));
    if (!data || data.length < 1000) break;
  }

  const [{ data: vehicles }, { data: clients }, { data: dismissedRow }] = await Promise.all([
    db.from('cvy_vehicles').select('id, name, team'),
    db.from('cvy_clients').select('lat, lng').not('lat', 'is', null),
    db.from('cvy_site_content').select('value').eq('key', 'gps_dismissed_places').maybeSingle(),
  ]);
  const truck = new Map((vehicles ?? []).map((v) => [v.id as string, v as { name: string; team: string | null }]));
  const pins = (clients ?? []) as { lat: number; lng: number }[];
  const dismissed = (Array.isArray(dismissedRow?.value) ? dismissedRow.value : []) as Dismissed[];

  const all: Suggestion[] = [];
  for (const c of clusterPoints(stops, CLUSTER_M)) {
    const days = new Set(c.items.map((i) => etToday(new Date(i.arrived_at))));
    if (c.items.length < MIN_STOPS || days.size < MIN_DAYS) continue;
    if (pins.some((p) => haversineM(p.lat, p.lng, c.lat, c.lng) <= NEAR_CLIENT_M)) continue;
    if (dismissed.some((d) => haversineM(d.lat, d.lng, c.lat, c.lng) <= DISMISS_M)) continue;

    const address = mode(c.items.map((i) => i.address).filter((a): a is string => !!a))?.value;
    if (!address) continue;
    const wd = mode(c.items.map((i) => etWeekday(i.arrived_at)));
    const weekday =
      wd && wd.count / c.items.length >= 0.5 && (CLIENT_DAYS as readonly string[]).includes(wd.value)
        ? (wd.value as ClientDay)
        : null;
    const names = c.items.map((i) => truck.get(i.vehicle_id)?.name ?? 'Truck');
    const byCount = Array.from(new Set(names)).sort(
      (a, b) => names.filter((n) => n === b).length - names.filter((n) => n === a).length
    );
    const team = mode(c.items.map((i) => truck.get(i.vehicle_id)?.team).filter((t): t is string => !!t))?.value ?? null;

    const typical = median(c.items.map((i) => i.minutes));
    const times = c.items.map((i) => new Date(i.arrived_at).getTime());
    const weeks = Math.max(1, (Math.max(...times) - Math.min(...times)) / (7 * 86400000));
    const weekdayShare = wd ? wd.count / c.items.length : 0;
    const likely =
      typical >= LIKELY_MIN_MINUTES &&
      days.size / weeks <= LIKELY_MAX_DAYS_PER_WEEK &&
      !(byCount.length >= 4 && weekdayShare < 0.5);

    all.push({
      key: `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`,
      lat: c.lat,
      lng: c.lng,
      address,
      stops: c.items.length,
      days: days.size,
      weekday,
      minutes: Math.max(5, Math.round(typical / 5) * 5),
      trucks: byCount.slice(0, 2),
      team,
      lastAt: c.items.reduce((m, i) => (i.arrived_at > m ? i.arrived_at : m), c.items[0].arrived_at),
      visitIds: c.items.map((i) => i.id).slice(0, 1000),
      likely,
    });
  }
  // Likely clients first, most regularly visited at the top.
  const likelyList = all.filter((s) => s.likely).sort((a, b) => b.days - a.days);
  const otherList = all.filter((s) => !s.likely).sort((a, b) => b.stops - a.stops);
  return {
    ok: true,
    suggestions: [...likelyList.slice(0, 80), ...otherList.slice(0, 30)],
    total: all.length,
    likelyTotal: likelyList.length,
  };
}

export async function addSuggestedClientAction(input: {
  name: string;
  suggestion: Suggestion;
}): Promise<{ ok: true; row: ClientRow } | { ok: false; error: string }> {
  const db = await signedInClient();
  if (!db) return { ok: false, error: 'Not signed in' };
  const s = input.suggestion;
  const name = input.name.trim().slice(0, 200);
  if (!name) return { ok: false, error: 'Give the client a name first' };

  const { count } = await db.from('cvy_clients').select('id', { count: 'exact', head: true });
  const { data, error } = await db
    .from('cvy_clients')
    .insert({
      name,
      address: s.address,
      service_minutes: s.minutes,
      required_day: null,
      current_day: s.weekday,
      current_team: s.team,
      sort_order: count ?? 0,
      lat: s.lat,
      lng: s.lng,
      geocode_status: 'manual', // pinned where the trucks actually park
    })
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };

  // Attach the stops that produced this suggestion to the new client.
  for (let i = 0; i < s.visitIds.length; i += 200) {
    const ids = s.visitIds.slice(i, i + 200);
    const linked = { kind: 'client', client_id: data.id, clients: [{ id: data.id, m: 0, min: null }] };
    const res = await db.from('cvy_visits').update(linked).in('id', ids);
    if (res.error && /clients/.test(res.error.message)) {
      await db.from('cvy_visits').update({ kind: 'client', client_id: data.id }).in('id', ids);
    }
  }

  return {
    ok: true,
    row: {
      ...(data as ClientRow),
      active: data.active !== false,
      mow: data.mow !== false,
      plow: data.plow !== false,
      sander: data.sander === true,
      team_required: data.team_required === true,
      bagged: data.bagged === true,
    },
  };
}

// "Not a client": a gas station, the dump, lunch. Never suggest it again.
export async function dismissSuggestionAction(place: Dismissed): Promise<{ ok: boolean; error?: string }> {
  const db = await signedInClient();
  if (!db) return { ok: false, error: 'Not signed in' };
  const { data: row } = await db.from('cvy_site_content').select('value').eq('key', 'gps_dismissed_places').maybeSingle();
  const list = (Array.isArray(row?.value) ? row.value : []) as Dismissed[];
  list.push({ lat: place.lat, lng: place.lng, label: place.label.slice(0, 200) });
  const { error } = await db.from('cvy_site_content').upsert({ key: 'gps_dismissed_places', value: list }, { onConflict: 'key' });
  return error ? { ok: false, error: error.message } : { ok: true };
}
