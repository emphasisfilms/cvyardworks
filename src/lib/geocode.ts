// Server-side address → coordinates. Free services, no keys:
//   1. US Census Bureau geocoder (good for US street addresses)
//   2. OpenStreetMap Nominatim as a fallback (1 request/second, needs a User-Agent)

export interface GeoPoint {
  lat: number;
  lng: number;
  source: 'census' | 'nominatim';
}

const UA = 'CVYardWorksAdmin/1.0 (www.cvyardworks.com)';

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('geocode timeout')), ms)),
  ]);
}

// Most of our clients are in NH/VT; add a state hint when the address has none.
function normalize(address: string): string {
  let a = address.trim().replace(/\s+/g, ' ');
  if (!/\b(NH|VT|MA|New Hampshire|Vermont|Massachusetts)\b/i.test(a)) a += ', NH';
  return a;
}

async function census(address: string): Promise<GeoPoint | null> {
  const url =
    'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=' +
    encodeURIComponent(address);
  const res = await withTimeout(fetch(url, { headers: { 'User-Agent': UA } }), 7000);
  if (!res.ok) return null;
  const j = (await res.json()) as {
    result?: { addressMatches?: { coordinates: { x: number; y: number } }[] };
  };
  const m = j.result?.addressMatches?.[0];
  if (!m) return null;
  return { lat: m.coordinates.y, lng: m.coordinates.x, source: 'census' };
}

async function nominatim(address: string): Promise<GeoPoint | null> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' +
    encodeURIComponent(address);
  const res = await withTimeout(fetch(url, { headers: { 'User-Agent': UA } }), 7000);
  if (!res.ok) return null;
  const j = (await res.json()) as { lat: string; lon: string }[];
  const m = j[0];
  if (!m) return null;
  return { lat: parseFloat(m.lat), lng: parseFloat(m.lon), source: 'nominatim' };
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const a = normalize(address);
  if (a.length < 6) return null;
  try {
    const c = await census(a);
    if (c) return c;
  } catch {
    /* fall through */
  }
  try {
    return await nominatim(a);
  } catch {
    return null;
  }
}
