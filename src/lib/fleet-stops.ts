// Pure stop detection: turn a truck's ordered GPS events into stops.
// No imports, so it can be tested on its own.
//
// Tuned against real FleetLocate data for this fleet:
//   - The devices do not send MOVE_START / MOVE_STOP. A day is mostly MOVE_PER
//     pings every ~30 s, plus IGN_ON/IGN_OFF, IDLE_PER (engine running, parked),
//     SLEEP_ENTER and MOTION (parked, no speed).
//   - Crews often leave the engine idling, so ignition alone misses stops.
// So a stop is a *dwell*: the truck comes to rest and stays within DWELL_RADIUS_M
// of that spot. It ends at the first event farther away than that. Short dwells
// (traffic lights) are dropped by the caller's minimum duration.

export interface StopEvent {
  type: string;
  at: string; // ISO
  lat: number | null;
  lng: number | null;
  speed: number | null; // mph; null on parked-type events
  address: string | null;
}

export interface Stop {
  arrived: string;
  departed: string | null; // null = still there at the end of the events
  lat: number | null; // median position while stopped
  lng: number | null;
  address: string | null; // most common address while stopped
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

export const DWELL_RADIUS_M = 150; // still "at the same place"
const STILL_MPH = 2; // at or below this the truck has come to rest

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

interface Open {
  arrived: string;
  anchorLat: number;
  anchorLng: number;
  lats: number[];
  lngs: number[];
  addresses: Map<string, number>;
  fallbackAddress: string | null;
  carried: boolean;
}

function finish(o: Open, departed: string | null): Stop {
  let address = o.fallbackAddress;
  let best = 0;
  for (const [a, n] of o.addresses) if (n > best) { best = n; address = a; }
  return {
    arrived: o.arrived,
    departed,
    lat: o.lats.length ? median(o.lats) : o.anchorLat,
    lng: o.lngs.length ? median(o.lngs) : o.anchorLng,
    address,
    carried: o.carried,
  };
}

// events must be sorted oldest first. `carried` is a stop that was already
// open before the first event (or null).
export function detectStops(
  events: StopEvent[],
  carried: { arrived: string; lat: number | null; lng: number | null; address: string | null } | null
): Stop[] {
  const stops: Stop[] = [];
  let open: Open | null =
    carried && carried.lat != null && carried.lng != null
      ? {
          arrived: carried.arrived,
          anchorLat: carried.lat,
          anchorLng: carried.lng,
          lats: [],
          lngs: [],
          addresses: new Map(),
          fallbackAddress: carried.address,
          carried: true,
        }
      : null;

  for (const e of events) {
    if (e.lat == null || e.lng == null) continue; // no position, nothing to learn
    const still = (e.speed ?? 0) <= STILL_MPH;

    if (open) {
      if (haversineM(open.anchorLat, open.anchorLng, e.lat, e.lng) > DWELL_RADIUS_M) {
        stops.push(finish(open, e.at));
        open = null;
      } else {
        if (still) {
          open.lats.push(e.lat);
          open.lngs.push(e.lng);
          if (e.address) open.addresses.set(e.address, (open.addresses.get(e.address) ?? 0) + 1);
        }
        continue;
      }
    }
    // Not in a stop (or just left one): coming to rest here opens a new one.
    if (still) {
      open = {
        arrived: e.at,
        anchorLat: e.lat,
        anchorLng: e.lng,
        lats: [e.lat],
        lngs: [e.lng],
        addresses: new Map(e.address ? [[e.address, 1]] : []),
        fallbackAddress: e.address,
        carried: false,
      };
    }
  }
  if (open) stops.push(finish(open, null));
  return stops;
}
