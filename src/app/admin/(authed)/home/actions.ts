'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  HeroContent,
  HomeAboutContent,
  HomeCtaContent,
} from '@/lib/supabase/content-types';

type Result = { ok: true } | { ok: false; error: string };

async function saveContent(key: string, value: unknown): Promise<Result> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { error } = await supabase
    .from('cvy_site_content')
    .upsert({ key, value }, { onConflict: 'key' });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  return { ok: true };
}

export async function saveHeroAction(value: HeroContent): Promise<Result> {
  return saveContent('hero', value);
}

export async function saveHomeAboutAction(value: HomeAboutContent): Promise<Result> {
  return saveContent('home_about', value);
}

export async function saveHomeCtaAction(value: HomeCtaContent): Promise<Result> {
  return saveContent('home_cta', value);
}
