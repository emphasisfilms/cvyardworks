'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { testFleetLocateConnection, type ConnectionTest } from '@/lib/fleetlocate';

export async function testFleetLocateAction(): Promise<ConnectionTest> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, stage: 'config', detail: 'Not signed in' };
  return testFleetLocateConnection();
}
