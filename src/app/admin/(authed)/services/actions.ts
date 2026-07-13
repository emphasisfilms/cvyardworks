'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PHOTO_BUCKET } from '@/lib/supabase/storage';
import type {
  Service,
  HomeServicesIntroContent,
} from '@/lib/supabase/content-types';

type Result = { ok: true } | { ok: false; error: string };

export async function saveServiceAction(svc: Service): Promise<Result> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: existing } = await supabase
    .from('cvy_services')
    .select('photo_path')
    .eq('id', svc.id)
    .maybeSingle();

  const { error } = await supabase
    .from('cvy_services')
    .update({
      season: svc.season,
      title: svc.title,
      description: svc.description,
      icon: svc.icon,
      color: svc.color,
      items: svc.items,
      photo_path: svc.photo_path,
    })
    .eq('id', svc.id);

  if (error) return { ok: false, error: error.message };

  const oldPath = existing?.photo_path ?? null;
  if (oldPath && oldPath !== svc.photo_path) {
    const { error: removeError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([oldPath]);
    if (removeError) {
      console.error(`saveServiceAction(${svc.id}): failed to delete old photo`, removeError);
    }
  }

  revalidatePath('/');
  return { ok: true };
}

export async function saveServicesIntroAction(
  value: HomeServicesIntroContent
): Promise<Result> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { error } = await supabase
    .from('cvy_site_content')
    .upsert({ key: 'home_services_intro', value }, { onConflict: 'key' });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  return { ok: true };
}
