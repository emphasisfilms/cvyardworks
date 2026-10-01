'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchFleetAssets, fleetLocateReady } from '@/lib/fleetlocate';
import { runFleetSync, type SyncResult } from '@/lib/fleet-sync';

type Result = { ok: true } | { ok: false; error: string };

// Run one sync pass as the signed-in admin (no service key needed).
export async function syncNowAction(): Promise<SyncResult> {
  const empty: SyncResult = { ok: false, vehicles: 0, events: 0, backfillDays: 0, backfillRemaining: 0, visits: 0, ms: 0 };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...empty, error: 'Not signed in' };
  if (!fleetLocateReady()) return { ...empty, error: 'FleetLocate credentials are not set on Vercel.' };
  return runFleetSync(supabase, { source: 'manual', budgetMs: 40000 });
}

export async function setVehicleTeamAction(id: string, team: string | null): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };
  const clean = team && /^\d{1,3}$/.test(team) ? team : null;
  const { error } = await supabase.from('cvy_vehicles').update({ team: clean }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type ShopResult =
  | { ok: true; lat: number; lng: number; trucks: number }
  | { ok: false; error: string };

// 7 Levi Ln is private land, so the street address pins at the road. Re-center
// the shop on where the trucks are actually parked right now.
export async function setShopFromTrucksAction(): Promise<ShopResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };
  if (!fleetLocateReady()) return { ok: false, error: 'FleetLocate credentials are not set on Vercel.' };

  const { data: row } = await supabase
    .from('cvy_site_content')
    .select('value')
    .eq('key', 'shop_location')
    .maybeSingle();
  const cur = (row?.value ?? { address: '7 Levi Ln, Walpole, NH 03608', lat: 43.0903376, lng: -72.4172135, radius_m: 250 }) as {
    address: string; lat: number; lng: number; radius_m: number;
  };

  let assets;
  try {
    assets = await fetchFleetAssets();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // Parked trucks within ~1.5 km of the address.
  const near = assets.filter((a) => {
    if (a.lat == null || a.lng == null || a.status === 'Moving') return false;
    const dLat = (a.lat - cur.lat) * 111320;
    const dLng = (a.lng - cur.lng) * 111320 * Math.cos((cur.lat * Math.PI) / 180);
    return Math.hypot(dLat, dLng) < 1500;
  });
  if (near.length < 2) {
    return { ok: false, error: `Only ${near.length} parked truck${near.length === 1 ? '' : 's'} near the shop right now. Try again when more are parked there.` };
  }
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const lat = median(near.map((a) => a.lat!));
  const lng = median(near.map((a) => a.lng!));

  const { error } = await supabase
    .from('cvy_site_content')
    .upsert({ key: 'shop_location', value: { ...cur, lat, lng, radius_m: 150 } }, { onConflict: 'key' });
  if (error) return { ok: false, error: error.message };
  return { ok: true, lat, lng, trucks: near.length };
}
