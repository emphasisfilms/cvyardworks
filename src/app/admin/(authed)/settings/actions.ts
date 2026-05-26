'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SiteSettingsContent } from '@/lib/supabase/content-types';

type Result = { ok: true } | { ok: false; error: string };

export async function saveSiteSettingsAction(
  value: SiteSettingsContent
): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  // Normalize phoneTel (digits only) from phone for tel: links.
  const phoneTel = value.phone.replace(/\D+/g, '');

  const { error } = await supabase
    .from('cvy_site_content')
    .upsert(
      { key: 'site_settings', value: { ...value, phoneTel } },
      { onConflict: 'key' }
    );

  if (error) return { ok: false, error: error.message };

  // Site settings are used across all public pages — revalidate everything.
  revalidatePath('/', 'layout');
  return { ok: true };
}
