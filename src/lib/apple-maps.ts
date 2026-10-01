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
// token is useless anywhere else.
export function mapkitToken(origin: string, ttlSeconds = 1800): string {
  const teamId = process.env.APPLE_MAPS_TEAM_ID;
  const keyId = process.env.APPLE_MAPS_KEY_ID;
  const rawKey = process.env.APPLE_MAPS_PRIVATE_KEY;
  if (!teamId || !keyId || !rawKey) throw new Error('Apple Maps is not configured');

  const now = Math.floor(Date.now() / 1000);
  const head = b64url({ alg: 'ES256', kid: keyId, typ: 'JWT' });
  const body = b64url({ iss: teamId, iat: now, exp: now + ttlSeconds, origin });
  const signature = cryptoSign('sha256', Buffer.from(`${head}.${body}`), {
    key: createPrivateKey(normalizePrivateKey(rawKey)),
    dsaEncoding: 'ieee-p1363', // JWTs want raw r||s, not DER
  });
  return `${head}.${body}.${b64url(signature)}`;
}
