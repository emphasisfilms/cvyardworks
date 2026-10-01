// Apple Maps (MapKit JS) — server-only token signing.
//
// Env vars (Vercel, Sensitive), the same three app.emphasis uses:
//   APPLE_MAPS_TEAM_ID      Apple Developer Team ID
//   APPLE_MAPS_KEY_ID       ID of the Maps key
//   APPLE_MAPS_PRIVATE_KEY  full contents of the key's .p8 file
//
// MapKit JS in the browser asks our /api/mapkit/token endpoint for a short
// lived JWT signed with that key. The key itself never leaves the server.
// The same key will sign requests to Apple's Maps Server API (routing, ETAs)
// when route optimization is built.

import { createPrivateKey, sign as cryptoSign } from 'crypto';

export function appleMapsReady(): boolean {
  return !!(process.env.APPLE_MAPS_TEAM_ID && process.env.APPLE_MAPS_KEY_ID && process.env.APPLE_MAPS_PRIVATE_KEY);
}

// Env vars can arrive with mangled whitespace (dashboard paste, literal \n,
// newlines collapsed to spaces). Rebuild canonical PEM from the base64 body.
function normalizePrivateKey(raw: string): string {
  const body = raw
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END)[A-Z ]*PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const wrapped = body.match(/.{1,64}/g)?.join('\n') ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
}

const b64url = (v: object | Buffer) =>
  (Buffer.isBuffer(v) ? v : Buffer.from(JSON.stringify(v))).toString('base64url');

// A MapKit JS token: an ES256 JWT. `origin` pins it to one website, so a copied
// token is useless anywhere else. Pass null for server-to-server calls.
export function mapkitToken(origin: string | null, ttlSeconds = 1800): string {
  const teamId = process.env.APPLE_MAPS_TEAM_ID;
  const keyId = process.env.APPLE_MAPS_KEY_ID;
  const rawKey = process.env.APPLE_MAPS_PRIVATE_KEY;
  if (!teamId || !keyId || !rawKey) throw new Error('Apple Maps is not configured');

  const now = Math.floor(Date.now() / 1000);
  const head = b64url({ alg: 'ES256', kid: keyId, typ: 'JWT' });
  const body = b64url({ iss: teamId, iat: now, exp: now + ttlSeconds, ...(origin ? { origin } : {}) });
  const signature = cryptoSign('sha256', Buffer.from(`${head}.${body}`), {
    key: createPrivateKey(normalizePrivateKey(rawKey)),
    dsaEncoding: 'ieee-p1363', // JWTs want raw r||s, not DER
  });
  return `${head}.${body}.${b64url(signature)}`;
}

export interface AppleMapsConfig {
  teamId: boolean;
  keyId: boolean;
  privateKey: boolean;
}

export function appleMapsConfig(): AppleMapsConfig {
  return {
    teamId: !!process.env.APPLE_MAPS_TEAM_ID,
    keyId: !!process.env.APPLE_MAPS_KEY_ID,
    privateKey: !!process.env.APPLE_MAPS_PRIVATE_KEY,
  };
}

export type AppleMapsTest = { ok: boolean; step: 'config' | 'format' | 'key' | 'apple' | 'done'; detail: string };

// Walks the chain one link at a time and says which one fails. Reports shapes
// and status codes only, never the key itself.
export async function testAppleMaps(): Promise<AppleMapsTest> {
  const teamId = process.env.APPLE_MAPS_TEAM_ID?.trim();
  const keyId = process.env.APPLE_MAPS_KEY_ID?.trim();
  const rawKey = process.env.APPLE_MAPS_PRIVATE_KEY;
  const missing = [
    !teamId && 'APPLE_MAPS_TEAM_ID',
    !keyId && 'APPLE_MAPS_KEY_ID',
    !rawKey && 'APPLE_MAPS_PRIVATE_KEY',
  ].filter(Boolean);
  if (missing.length) return { ok: false, step: 'config', detail: `Not set on Vercel: ${missing.join(', ')}` };

  // Apple's Team IDs and Key IDs are both exactly 10 letters and digits.
  const shape = /^[A-Z0-9]{10}$/;
  if (!shape.test(teamId!)) {
    return { ok: false, step: 'format', detail: `APPLE_MAPS_TEAM_ID should be 10 capital letters and digits; the stored value is ${teamId!.length} characters${/\s/.test(process.env.APPLE_MAPS_TEAM_ID!) ? ' and contains a space' : ''}.` };
  }
  if (!shape.test(keyId!)) {
    return { ok: false, step: 'format', detail: `APPLE_MAPS_KEY_ID should be 10 capital letters and digits; the stored value is ${keyId!.length} characters.` };
  }

  let token: string;
  try {
    token = mapkitToken(null, 300);
  } catch {
    return { ok: false, step: 'key', detail: 'APPLE_MAPS_PRIVATE_KEY could not be read as a key. Re-paste the whole .p8 file, including the BEGIN and END lines.' };
  }

  // Apple's Maps Server API uses the same key; asking it for an access token
  // proves the Team ID, Key ID and key belong together and are enabled for Maps.
  try {
    const res = await fetch('https://maps-api.apple.com/v1/token', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      return { ok: true, step: 'done', detail: `Apple accepted the key (Team ${teamId!.slice(0, 3)}…, Key ${keyId}). Maps and routing are both available.` };
    }
    return {
      ok: false,
      step: 'apple',
      detail: `Apple rejected the key (HTTP ${res.status}). The Team ID, Key ID and .p8 file don’t belong together, or this key isn’t enabled for MapKit JS. Key ID in use: ${keyId}.`,
    };
  } catch (e) {
    return { ok: false, step: 'apple', detail: `Could not reach Apple: ${(e as Error).message}` };
  }
}
