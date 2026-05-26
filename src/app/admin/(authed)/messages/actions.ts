'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Result = { ok: true } | { ok: false; error: string };

export async function markReadAction(
  id: string,
  isRead: boolean
): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { error } = await supabase
    .from('cvy_messages')
    .update({ is_read: isRead })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/messages');
  revalidatePath('/admin');
  return { ok: true };
}

export async function deleteMessageAction(id: string): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { error } = await supabase.from('cvy_messages').delete().eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/messages');
  revalidatePath('/admin');
  return { ok: true };
}
