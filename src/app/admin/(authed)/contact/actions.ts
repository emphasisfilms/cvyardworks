'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ContactPageContent } from '@/lib/supabase/content-types';

type Result = { ok: true } | { ok: false; error: string };

export async function saveContactPageAction(
  value: ContactPageContent
): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { error } = await supabase
    .from('cvy_site_content')
    .upsert({ key: 'contact_page', value }, { onConflict: 'key' });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/contact');
  return { ok: true };
}
