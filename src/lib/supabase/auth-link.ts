// Helpers for Supabase auth links (invite / password recovery / magic link).
//
// Links from the Supabase dashboard land on the project's Site URL with the
// tokens in the URL hash (#access_token=…&type=invite). Links we send from
// the login page use the same implicit flow so they work on any device.

export const AUTH_LINK_TYPES = ['invite', 'recovery', 'magiclink', 'signup', 'email_change'] as const;

export interface AuthLinkParams {
  access_token?: string;
  refresh_token?: string;
  type?: string;
  error?: string;
  error_description?: string;
  code?: string;
}

export function parseAuthLink(hash: string, search: string): AuthLinkParams {
  const out: AuthLinkParams = {};
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const q = new URLSearchParams(search);
  for (const k of ['access_token', 'refresh_token', 'type', 'error', 'error_description'] as const) {
    const v = h.get(k) ?? q.get(k);
    if (v) out[k] = v;
  }
  const code = q.get('code');
  if (code) out.code = code;
  return out;
}

export function isAuthLink(hash: string): boolean {
  return /(^|[#&])(access_token|error_description)=|(^|[#&])type=(invite|recovery|magiclink|signup)/.test(hash);
}
