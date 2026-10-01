'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { testFleetLocateConnection, type ConnectionTest } from '@/lib/fleetlocate';
import { testAppleMaps, type AppleMapsTest } from '@/lib/apple-maps';

export async function testFleetLocateAction(): Promise<ConnectionTest> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, stage: 'config', detail: 'Not signed in' };
  return testFleetLocateConnection();
}

export async function testAppleMapsAction(): Promise<AppleMapsTest> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, step: 'config', detail: 'Not signed in' };
  return testAppleMaps();
}
