'use server';

// FEATURE: heat — where the fleet has spent its time, as bubbles sized by hours.
// Remove: delete this folder and the two `feature: heat` lines in MapGpsTools.tsx.

import { signedInClient } from '../auth';
import { clusterPoints } from '../shared';

export interface HeatSpot {
  lat: number;
  lng: number;
  minutes: number;
  visits: number;
  label: string | null;
}

export async function getHeatAction(): Promise<{ ok: true; spots: HeatSpot[] } | { ok: false; error: string }> {
  const db = await signedInClient();
  if (!db) return { ok: false, error: 'Not signed in' };

  // Every finished stop away from the shop.
  const stops: { lat: number; lng: number; minutes: number; address: string | null }[] = [];
  for (let off = 0; off < 30000; off += 1000) {
    const { data, error } = await db
      .from('cvy_visits')
      .select('lat, lng, minutes, address')
      .neq('kind', 'shop')
      .not('lat', 'is', null)
      .not('minutes', 'is', null)
      .order('arrived_at')
      .range(off, off + 999);
    if (error) return { ok: false, error: error.message };
    stops.push(...((data ?? []) as typeof stops));
    if (!data || data.length < 1000) break;
  }

  const spots = clusterPoints(stops, 150)
    .map((c) => ({
      lat: c.lat,
      lng: c.lng,
      minutes: c.items.reduce((t, i) => t + i.minutes, 0),
      visits: c.items.length,
      label: c.items[0].address,
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 400);
  return { ok: true, spots };
}
