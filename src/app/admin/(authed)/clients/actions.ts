'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  CLIENT_DAYS,
  CLIENT_TEAMS,
  type ClientDay,
  type ClientRow,
  type ClientTeam,
} from '@/lib/supabase/content-types';

type Result = { ok: true } | { ok: false; error: string };

function day(v: unknown): ClientDay | null {
  return typeof v === 'string' && (CLIENT_DAYS as readonly string[]).includes(v)
    ? (v as ClientDay)
    : null;
}

function team(v: unknown): ClientTeam | null {
  const s = v == null ? '' : String(v).trim();
  return (CLIENT_TEAMS as readonly string[]).includes(s) ? (s as ClientTeam) : null;
}

function text(v: unknown, max = 500): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function clean(row: ClientRow): ClientRow {
  const mins =
    typeof row.service_minutes === 'number' && Number.isFinite(row.service_minutes)
      ? Math.max(0, Math.round(row.service_minutes))
      : null;
  return {
    id: row.id,
    name: text(row.name, 200),
    address: text(row.address, 500),
    service_minutes: mins,
    required_day: day(row.required_day),
    current_day: day(row.current_day),
    current_team: team(row.current_team),
    team_required: row.team_required === true,
    bagged: row.bagged === true,
    notes: text(row.notes, 2000) || null,
    sort_order: Number.isFinite(row.sort_order) ? row.sort_order : 0,
  };
}

// Upsert a batch of rows (new rows carry a client-generated uuid).
export async function saveClientsAction(rows: ClientRow[]): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const payload = rows.map(clean).filter((r) => r.name);
  if (payload.length === 0) return { ok: true };

  const { error } = await supabase.from('cvy_clients').upsert(payload, { onConflict: 'id' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteClientAction(id: string): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { error } = await supabase.from('cvy_clients').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
