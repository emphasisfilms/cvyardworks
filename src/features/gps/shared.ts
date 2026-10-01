// Shared helpers for the GPS features in this folder. Pure functions only —
// safe to import from server actions and client components alike.
//
// Every feature lives in its own sub-folder and is wired into a page by a
// single line marked `feature: <name>`. See docs/GPS-FEATURES.md for the map
// of features and how to remove one.

import { haversineM } from '@/lib/fleet-stops';

export { haversineM };

export const ET = 'America/New_York';
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// Today's date in Eastern time, as YYYY-MM-DD.
export function etToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ET, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// The UTC instants that bound one Eastern-time calendar day.
export function etDayRangeUTC(day: string): { from: string; to: string } {
  const [y, m, d] = day.split('-').map(Number);
  const noonUTC = new Date(Date.UTC(y, m - 1, d, 12));
  const hourET = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: ET, hour: 'numeric', hourCycle: 'h23' }).format(noonUTC)
  );
  const offset = 12 - hourET; // 4 in summer (EDT), 5 in winter (EST)
  const from = new Date(Date.UTC(y, m - 1, d, offset));
  return { from: from.toISOString(), to: new Date(from.getTime() + 86400000).toISOString() };
}

const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: ET, weekday: 'short', month: 'short', day: 'numeric' });
const weekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone: ET, weekday: 'short' });

export const etTime = (iso: string | null | undefined) => (iso ? timeFmt.format(new Date(iso)) : '—');
export const etDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : '—');
export const etWeekday = (iso: string) => weekdayFmt.format(new Date(iso));

export function fmtMins(m: number | null | undefined): string {
  if (m == null) return '—';
  const r = Math.round(m);
  const h = Math.floor(r / 60);
  const rem = r % 60;
  return h ? `${h}h ${rem ? `${rem}m` : ''}`.trim() : `${rem}m`;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Most common value, with how often it occurred.
export function mode<T>(xs: T[]): { value: T; count: number } | null {
  const counts = new Map<T, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  let best: { value: T; count: number } | null = null;
  for (const [value, count] of counts) if (!best || count > best.count) best = { value, count };
  return best;
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Group points that sit within `radiusM` of each other. Greedy: a point joins
// the first cluster whose running centre is close enough, else starts its own.
export interface Cluster<T> {
  lat: number;
  lng: number;
  items: T[];
}
export function clusterPoints<T extends { lat: number; lng: number }>(points: T[], radiusM: number): Cluster<T>[] {
  const clusters: Cluster<T>[] = [];
  // Coarse grid index so each point only checks nearby clusters.
  const cell = radiusM / 111320; // degrees of latitude
  const grid = new Map<string, Cluster<T>[]>();
  const key = (lat: number, lng: number) => `${Math.floor(lat / cell)}:${Math.floor(lng / (cell * 1.4))}`;
  for (const p of points) {
    const gi = Math.floor(p.lat / cell);
    const gj = Math.floor(p.lng / (cell * 1.4));
    let found: Cluster<T> | null = null;
    for (let di = -1; di <= 1 && !found; di++) {
      for (let dj = -1; dj <= 1 && !found; dj++) {
        for (const c of grid.get(`${gi + di}:${gj + dj}`) ?? []) {
          if (haversineM(c.lat, c.lng, p.lat, p.lng) <= radiusM) {
            found = c;
            break;
          }
        }
      }
    }
    if (found) {
      found.items.push(p);
    } else {
      const c: Cluster<T> = { lat: p.lat, lng: p.lng, items: [p] };
      clusters.push(c);
      const k = key(p.lat, p.lng);
      grid.set(k, [...(grid.get(k) ?? []), c]);
    }
  }
  // Report each cluster at the median of its members.
  for (const c of clusters) {
    c.lat = median(c.items.map((i) => i.lat));
    c.lng = median(c.items.map((i) => i.lng));
  }
  return clusters;
}
