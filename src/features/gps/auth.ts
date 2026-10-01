// Server-only: every GPS feature action starts with this.
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function signedInClient() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? supabase : null;
}
