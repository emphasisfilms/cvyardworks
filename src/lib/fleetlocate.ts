// Spireon FleetLocate — NSpire Platform API (guide v1.61.0).
//
// Credentials live only in environment variables (Vercel: Sensitive):
//   FLEETLOCATE_USERNAME, FLEETLOCATE_PASSWORD, FLEETLOCATE_APP_TOKEN
//
// Per the guide:
//   - REST base:  https://services.spireon.com/v0/rest   (e.g. GET /assets)
//   - Every request carries  X-Nspire-AppToken: <token>  plus HTTP Basic auth
//     (a long-lived Bearer JWT from https://identity.spireon.com/identity/token
//     is an optional alternative; Basic is enough for our volume)
//   - Collections return { content: [...], count, total } with limit/offset paging
//   - No rate limit on our account (confirmed by Spireon support, case 03894859)

export const FLEETLOCATE_API_BASE =
  process.env.FLEETLOCATE_API_BASE ?? 'https://services.spireon.com/v0/rest';

export function fleetLocateConfig() {
  return {
    username: !!process.env.FLEETLOCATE_USERNAME,
    password: !!process.env.FLEETLOCATE_PASSWORD,
    appToken: !!process.env.FLEETLOCATE_APP_TOKEN,
  };
}

export function fleetLocateReady(): boolean {
  const c = fleetLocateConfig();
  return c.username && c.password && c.appToken;
}

function authHeaders(): Record<string, string> {
  const basic = Buffer.from(
    `${process.env.FLEETLOCATE_USERNAME}:${process.env.FLEETLOCATE_PASSWORD}`,
    'utf8'
  ).toString('base64');
  return {
    'X-Nspire-AppToken': process.env.FLEETLOCATE_APP_TOKEN ?? '',
    Authorization: `Basic ${basic}`,
    Accept: 'application/json',
  };
}

class FleetLocateError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${FLEETLOCATE_API_BASE}${path}`, {
      headers: authHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    throw new FleetLocateError(`Could not reach Spireon: ${(e as Error).message}`);
  }
  if (!res.ok) {
    const msg =
      res.status === 401 || res.status === 403
        ? `Spireon rejected the login (HTTP ${res.status}). Check the username, password and application token on Vercel.`
        : res.status === 429
          ? 'Spireon is throttling requests (HTTP 429). Try again shortly.'
          : `Spireon returned HTTP ${res.status}.`;
    throw new FleetLocateError(msg, res.status);
  }
  return (await res.json()) as T;
}

interface Page<T> {
  content: T[];
  count: number;
  total: number;
}

// Raw asset as documented under "Assets" in the guide. Unknown fields are ignored.
interface RawAsset {
  id: string;
  name?: string;
  description?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: string | number;
  active?: boolean;
  status?: string; // Stopped | Moving | Idle
  statusStartDate?: string;
  speed?: number; // mph
  odometer?: number;
  engineHours?: number;
  batteryVoltage?: number;
  locationLastReported?: string;
  lastLocation?: {
    lat?: number;
    lng?: number;
    address?: { line1?: string; city?: string; stateOrProvince?: string; postalCode?: string };
  };
}

export interface FleetAsset {
  id: string;
  name: string;
  vehicle: string; // "2019 Ford F-350"
  vin: string | null;
  status: 'Moving' | 'Idle' | 'Stopped' | 'Unknown';
  statusSince: string | null;
  speed: number | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  lastReported: string | null;
  odometer: number | null;
  engineHours: number | null;
}

function toAsset(a: RawAsset): FleetAsset {
  const addr = a.lastLocation?.address;
  const status = a.status === 'Moving' || a.status === 'Idle' || a.status === 'Stopped' ? a.status : 'Unknown';
  return {
    id: a.id,
    name: a.name || a.description || a.vin || a.id,
    vehicle: [a.year, a.make, a.model].filter(Boolean).join(' '),
    vin: a.vin ?? null,
    status,
    statusSince: parseSpireonDate(a.statusStartDate),
    speed: typeof a.speed === 'number' ? a.speed : null,
    lat: typeof a.lastLocation?.lat === 'number' ? a.lastLocation.lat : null,
    lng: typeof a.lastLocation?.lng === 'number' ? a.lastLocation.lng : null,
    address: addr ? [addr.line1, addr.city, addr.stateOrProvince].filter(Boolean).join(', ') : null,
    lastReported: parseSpireonDate(a.locationLastReported),
    odometer: typeof a.odometer === 'number' ? a.odometer : null,
    engineHours: typeof a.engineHours === 'number' ? a.engineHours : null,
  };
}

// All active vehicles with their last known position.
export async function fetchFleetAssets(): Promise<FleetAsset[]> {
  const out: FleetAsset[] = [];
  const limit = 100;
  for (let offset = 0; offset < 1000; offset += limit) {
    const page = await get<Page<RawAsset>>(`/assets?active=true&limit=${limit}&offset=${offset}`);
    out.push(...(page.content ?? []).map(toAsset));
    if (!page.content?.length || out.length >= (page.total ?? 0)) break;
  }
  return out;
}

export type ConnectionTest =
  | { ok: true; detail: string }
  | { ok: false; stage: 'config' | 'network' | 'auth'; detail: string };

// Reports only status and counts — never the credentials themselves.
export async function testFleetLocateConnection(): Promise<ConnectionTest> {
  const c = fleetLocateConfig();
  const missing = [
    !c.username && 'FLEETLOCATE_USERNAME',
    !c.password && 'FLEETLOCATE_PASSWORD',
    !c.appToken && 'FLEETLOCATE_APP_TOKEN',
  ].filter(Boolean) as string[];
  if (missing.length) {
    return { ok: false, stage: 'config', detail: `Not set on Vercel: ${missing.join(', ')}` };
  }
  try {
    const page = await get<Page<RawAsset>>('/assets?limit=1');
    const n = page.total ?? page.count ?? 0;
    return { ok: true, detail: `Connected. Spireon reports ${n} vehicle${n === 1 ? '' : 's'} on the account.` };
  } catch (e) {
    const err = e as FleetLocateError;
    return {
      ok: false,
      stage: err.status ? 'auth' : 'network',
      detail: err.message,
    };
  }
}


// ---- Events (history) ----

// Spireon dates look like 2015-08-21T03:12:30.000+0000; make the offset ISO-strict.
export function parseSpireonDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface RawEvent {
  id?: string;
  type?: string;
  date?: string;
  speed?: number;
  heading?: number;
  odometer?: number;
  engineHours?: number;
  location?: {
    lat?: number;
    lng?: number;
    address?: { line1?: string; city?: string; stateOrProvince?: string; postalCode?: string };
  } | null;
  eventData?: unknown;
}

export interface FleetEvent {
  id: string;
  type: string;
  at: string; // ISO
  lat: number | null;
  lng: number | null;
  speed: number | null;
  heading: number | null;
  odometer: number | null;
  engineHours: number | null;
  address: string | null;
  data: unknown | null;
}

export interface EventPage {
  events: FleetEvent[];
  count: number; // rows Spireon returned in this page (before we drop any unusable ones)
  total: number;
}

// One page of an asset's events between two instants (ISO strings).
export async function fetchAssetEvents(
  assetId: string,
  startISO: string,
  endISO: string | null,
  limit: number,
  offset: number
): Promise<EventPage> {
  const q = new URLSearchParams({ startDate: startISO, limit: String(limit), offset: String(offset) });
  if (endISO) q.set('endDate', endISO);
  const page = await get<Page<RawEvent>>(`/assets/${encodeURIComponent(assetId)}/events?${q.toString()}`);
  const events: FleetEvent[] = [];
  for (const e of page.content ?? []) {
    const at = parseSpireonDate(e.date);
    if (!at || !e.type) continue;
    const a = e.location?.address;
    events.push({
      id: e.id || `${assetId}:${at}:${e.type}`,
      type: e.type,
      at,
      lat: typeof e.location?.lat === 'number' ? e.location.lat : null,
      lng: typeof e.location?.lng === 'number' ? e.location.lng : null,
      speed: typeof e.speed === 'number' ? Math.round(e.speed) : null,
      heading: typeof e.heading === 'number' ? e.heading : null,
      odometer: typeof e.odometer === 'number' ? e.odometer : null,
      engineHours: typeof e.engineHours === 'number' ? e.engineHours : null,
      address: a ? [a.line1, a.city, a.stateOrProvince].filter(Boolean).join(', ') || null : null,
      data: e.eventData ?? null,
    });
  }
  return { events, count: page.content?.length ?? 0, total: page.total ?? 0 };
}
