'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CLIENT_DAYS, type ClientDay, type ClientRow, type ClientTeam } from '@/lib/supabase/content-types';
import { geocodeAddress } from '@/lib/geocode';

type Result = { ok: true } | { ok: false; error: string };

function day(v: unknown): ClientDay | null {
  return typeof v === 'string' && (CLIENT_DAYS as readonly string[]).includes(v)
    ? (v as ClientDay)
    : null;
}

function team(v: unknown): ClientTeam | null {
  const s = v == null ? '' : String(v).trim().replace(/^(team|crew)\s*/i, '');
  return /^\d{1,3}$/.test(s) ? String(parseInt(s, 10)) : null;
}

function text(v: unknown, max = 500): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function clean(row: ClientRow): ClientRow {
  const mins =
    typeof row.service_minutes === 'number' && Number.isFinite(row.service_minutes)
      ? Math.max(0, Math.round(row.service_minutes))
      : null;
  return {
    id: row.id,
    name: text(row.name, 200),
    address: text(row.address, 500),
    service_minutes: mins,
    required_day: day(row.required_day),
    current_day: day(row.current_day),
    current_team: team(row.current_team),
    team_required: row.team_required === true,
    bagged: row.bagged === true,
    active: row.active !== false,
    mow: row.mow !== false,
    plow: row.plow === true,
    notes: text(row.notes, 2000) || null,
    sort_order: Number.isFinite(row.sort_order) ? row.sort_order : 0,
    lat: typeof row.lat === 'number' && Number.isFinite(row.lat) ? row.lat : null,
    lng: typeof row.lng === 'number' && Number.isFinite(row.lng) ? row.lng : null,
    geocode_status:
      row.geocode_status === 'ok' || row.geocode_status === 'failed' || row.geocode_status === 'manual'
        ? row.geocode_status
        : null,
  };
}

// Upsert a batch of rows (new rows carry a client-generated uuid).
export async function saveClientsAction(rows: ClientRow[]): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const payload = rows.map(clean).filter((r) => r.name);
  if (payload.length === 0) return { ok: true };

  // If an address changed, its old pin is wrong: clear it so it gets geocoded again.
  // (Hand-placed pins are kept unless the address itself changes.)
  const { data: existing } = await supabase
    .from('cvy_clients')
    .select('id, address, lat, lng, geocode_status')
    .in('id', payload.map((r) => r.id));
  const prev = new Map((existing ?? []).map((e) => [e.id as string, e]));
  for (const r of payload) {
    const e = prev.get(r.id);
    if (!e) {
      r.lat = null; r.lng = null; r.geocode_status = null;
    } else if ((e.address ?? '') !== r.address) {
      r.lat = null; r.lng = null; r.geocode_status = null;
    } else {
      // Address unchanged: never let a stale client copy overwrite server-side coords.
      r.lat = e.lat ?? null; r.lng = e.lng ?? null; r.geocode_status = e.geocode_status ?? null;
    }
  }

  const { error } = await supabase.from('cvy_clients').upsert(payload, { onConflict: 'id' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type GeocodeResult =
  | { ok: true; updated: { id: string; lat: number | null; lng: number | null; geocode_status: 'ok' | 'failed' }[]; remaining: number }
  | { ok: false; error: string };

// Geocode clients that have an address but no pin yet, a few at a time so the
// call stays well inside the server time limit. The page calls this repeatedly
// until `remaining` is 0.
export async function geocodeMissingAction(retryFailed = false): Promise<GeocodeResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  let q = supabase
    .from('cvy_clients')
    .select('id, address, geocode_status')
    .is('lat', null)
    .neq('address', '')
    .order('sort_order');
  if (!retryFailed) q = q.or('geocode_status.is.null,geocode_status.neq.failed');
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };

  const todo = data ?? [];
  const batch = todo.slice(0, 12);
  const updated: { id: string; lat: number | null; lng: number | null; geocode_status: 'ok' | 'failed' }[] = [];
  for (const row of batch) {
    const pt = await geocodeAddress(row.address as string);
    const patch = pt
      ? { lat: pt.lat, lng: pt.lng, geocode_status: 'ok' as const, geocoded_at: new Date().toISOString() }
      : { lat: null, lng: null, geocode_status: 'failed' as const, geocoded_at: new Date().toISOString() };
    await supabase.from('cvy_clients').update(patch).eq('id', row.id);
    updated.push({ id: row.id as string, lat: patch.lat, lng: patch.lng, geocode_status: patch.geocode_status });
  }
  return { ok: true, updated, remaining: Math.max(0, todo.length - batch.length) };
}

// Drop a pin by hand (from the map) for an address the geocoder couldn't find.
export async function setClientPinAction(id: string, lat: number, lng: number): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };
  const { error } = await supabase
    .from('cvy_clients')
    .update({ lat, lng, geocode_status: 'manual', geocoded_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteClientAction(id: string): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { error } = await supabase.from('cvy_clients').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
