// Spireon FleetLocate (NSpire platform) — connection plumbing.
//
// Credentials live only in environment variables (Vercel: Sensitive):
//   FLEETLOCATE_USERNAME, FLEETLOCATE_PASSWORD, FLEETLOCATE_APP_TOKEN
// The API requires the application token on every call, so nothing works
// until Spireon has issued one.
//
// Endpoint details below follow Spireon's NSpire platform conventions and
// must be confirmed against the account's developer portal (api.spireon.com/doc)
// once we have portal access. Override with FLEETLOCATE_TOKEN_URL / FLEETLOCATE_API_BASE
// if the docs say otherwise.

export const FLEETLOCATE_TOKEN_URL =
  process.env.FLEETLOCATE_TOKEN_URL ?? 'https://api.nspireplatform.io/identity/token';
export const FLEETLOCATE_API_BASE =
  process.env.FLEETLOCATE_API_BASE ?? 'https://api.us.spireon.com/api';

export function fleetLocateConfig() {
  return {
    username: !!process.env.FLEETLOCATE_USERNAME,
    password: !!process.env.FLEETLOCATE_PASSWORD,
    appToken: !!process.env.FLEETLOCATE_APP_TOKEN,
  };
}

export type ConnectionTest =
  | { ok: true; detail: string }
  | { ok: false; stage: 'config' | 'network' | 'auth'; detail: string };

// Try to obtain a user token. Reports only status codes and generic messages —
// never the credentials themselves.
export async function testFleetLocateConnection(): Promise<ConnectionTest> {
  const user = process.env.FLEETLOCATE_USERNAME;
  const pass = process.env.FLEETLOCATE_PASSWORD;
  const app = process.env.FLEETLOCATE_APP_TOKEN;
  const missing = [
    !user && 'FLEETLOCATE_USERNAME',
    !pass && 'FLEETLOCATE_PASSWORD',
    !app && 'FLEETLOCATE_APP_TOKEN',
  ].filter(Boolean) as string[];
  if (missing.length) {
    return { ok: false, stage: 'config', detail: `Not set on Vercel: ${missing.join(', ')}` };
  }

  const basic = Buffer.from(`${user}:${pass}`).toString('base64');
  let res: Response;
  try {
    res = await fetch(FLEETLOCATE_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'X-Nspire-AppToken': app!,
        'X-Nspire-CorrelationId': crypto.randomUUID(),
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    return { ok: false, stage: 'network', detail: `Could not reach ${FLEETLOCATE_TOKEN_URL}: ${(e as Error).message}` };
  }

  if (res.ok) {
    return { ok: true, detail: `Signed in (HTTP ${res.status}). Token endpoint accepted the credentials.` };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, stage: 'auth', detail: `Spireon rejected the login (HTTP ${res.status}). Check the username, password and application token.` };
  }
  return { ok: false, stage: 'auth', detail: `Unexpected response from Spireon (HTTP ${res.status}). The endpoint may differ for this account type — confirm against the developer portal.` };
}
