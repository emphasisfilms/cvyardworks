'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TeamRow } from '@/lib/supabase/content-types';

type Result = { ok: true } | { ok: false; error: string };

function text(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function clean(row: TeamRow): TeamRow {
  return {
    id: row.id,
    number: Math.max(1, Math.round(Number(row.number) || 0)),
    name: text(row.name, 100),
    lead_name: text(row.lead_name, 100),
    lead_phone: text(row.lead_phone, 40),
    has_bagger: row.has_bagger === true,
    active: row.active !== false,
    notes: text(row.notes, 2000) || null,
  };
}

export async function saveTeamsAction(rows: TeamRow[]): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const payload = rows.map(clean);
  const numbers = payload.map((r) => r.number);
  if (new Set(numbers).size !== numbers.length) {
    return { ok: false, error: 'Two teams have the same number' };
  }

  const { error } = await supabase.from('cvy_teams').upsert(payload, { onConflict: 'id' });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'That team number is already in use' };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteTeamAction(id: string, number: number): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  // Refuse to delete a team that still has clients assigned to it.
  const { count } = await supabase
    .from('cvy_clients')
    .select('id', { count: 'exact', head: true })
    .eq('current_team', String(number));
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Team ${number} still has ${count} client${count === 1 ? '' : 's'} assigned. Reassign them first, or mark the team inactive.`,
    };
  }

  const { error } = await supabase.from('cvy_teams').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
