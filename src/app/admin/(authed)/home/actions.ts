'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PHOTO_BUCKET } from '@/lib/supabase/storage';
import type {
  HeroContent,
  HomeAboutContent,
  HomeCtaContent,
} from '@/lib/supabase/content-types';

type Result = { ok: true } | { ok: false; error: string };

// photoField: name of a photo-path property inside `value`. When the save
// replaces or clears it, the old storage object is deleted so the bucket
// doesn't accumulate orphans.
async function saveContent(
  key: string,
  value: unknown,
  photoField?: string
): Promise<Result> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  let oldPath: string | null = null;
  if (photoField) {
    const { data: existing } = await supabase
      .from('cvy_site_content')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    const v = existing?.value as Record<string, unknown> | undefined;
    oldPath = typeof v?.[photoField] === 'string' ? (v[photoField] as string) : null;
  }

  const { error } = await supabase
    .from('cvy_site_content')
    .upsert({ key, value }, { onConflict: 'key' });

  if (error) return { ok: false, error: error.message };

  if (photoField && oldPath) {
    const newPath = (value as Record<string, unknown>)[photoField] ?? null;
    if (oldPath !== newPath) {
      const { error: removeError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .remove([oldPath]);
      if (removeError) {
        console.error(`saveContent(${key}): failed to delete old photo`, removeError);
      }
    }
  }

  revalidatePath('/');
  return { ok: true };
}

export async function saveHeroAction(value: HeroContent): Promise<Result> {
  return saveContent('hero', value, 'backgroundPath');
}

export async function saveHomeAboutAction(value: HomeAboutContent): Promise<Result> {
  return saveContent('home_about', value, 'imagePath');
}

export async function saveHomeCtaAction(value: HomeCtaContent): Promise<Result> {
  return saveContent('home_cta', value);
}
