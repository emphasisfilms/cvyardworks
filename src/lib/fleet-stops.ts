// Pure stop detection: turn a truck's ordered GPS events into stops.
// No imports, so it can be tested on its own.

export interface StopEvent {
  type: string;
  at: string; // ISO
  lat: number | null;
  lng: number | null;
  speed: number | null;
  address: string | null;
}

export interface Stop {
  arrived: string;
  departed: string | null; // null = still parked at the end of the events
  lat: number | null;
  lng: number | null;
  address: string | null;
  carried: boolean; // began before these events (an already-open stop)
}

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const DRIFT_M = 200; // moved this far from where it parked => it left

// events must be sorted oldest first. `carried` is a stop that was already
// open before the first event (or null).
export function detectStops(events: StopEvent[], carried: Omit<Stop, 'carried' | 'departed'> | null): Stop[] {
  const stops: Stop[] = [];
  let open: Stop | null = carried ? { ...carried, departed: null, carried: true } : null;

  for (const e of events) {
    const movedAway =
      open !== null &&
      open.lat != null && open.lng != null && e.lat != null && e.lng != null &&
      haversineM(open.lat, open.lng, e.lat, e.lng) > DRIFT_M;
    const moving =
      e.type === 'MOVE_START' ||
      (e.type === 'MOVE_PER' && (e.speed ?? 0) > 0) ||
      (e.speed ?? 0) > 3 ||
      movedAway;

    if (open) {
      if (moving) {
        open.departed = e.at;
        stops.push(open);
        open = null;
      }
    } else if ((e.type === 'MOVE_STOP' || e.type === 'IGN_OFF') && !moving) {
      open = { arrived: e.at, departed: null, lat: e.lat, lng: e.lng, address: e.address, carried: false };
    }
  }
  if (open) stops.push(open);
  return stops;
}
