import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ClientRow, TeamRow } from '@/lib/supabase/content-types';

// Shared loader for the Clients & Routes table and the Map page.
export async function loadClientsAndTeams() {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, teamsRes] = await Promise.all([
    supabase.from('cvy_clients').select('*').order('sort_order').order('name'),
    supabase.from('cvy_teams').select('*').order('number'),
  ]);

  // Until the teams migration is run, fall back to the original six numbered teams.
  const teams: TeamRow[] =
    !teamsRes.error && teamsRes.data && teamsRes.data.length > 0
      ? (teamsRes.data as TeamRow[])
      : [1, 2, 3, 4, 5, 6].map((n) => ({
          id: String(n),
          number: n,
          name: '',
          lead_name: '',
          lead_phone: '',
          has_bagger: true,
          active: true,
          notes: null,
        }));

  const clients: ClientRow[] = ((data ?? []) as ClientRow[]).map((r) => ({
    ...r,
    active: r.active !== false,
    mow: r.mow !== false,
    plow: r.plow !== false,
    sander: r.sander === true,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    geocode_status: r.geocode_status ?? null,
  }));

  return {
    clients,
    teams,
    error,
    teamsError: teamsRes.error,
    // Coordinates columns exist (migration 007) if the first row carries a lat key.
    geoReady: !error && (data?.length === 0 || (data?.[0] !== undefined && 'lat' in data[0])),
  };
}
