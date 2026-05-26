import { createSupabaseServerClient } from './server';
import type { ContentByKey, ContentKey } from './content-types';

// Fetch one or more content rows from cvy_site_content.
// Returns { [key]: value } typed against ContentByKey.
export async function fetchContent<K extends ContentKey>(
  keys: K[]
): Promise<{ [P in K]: ContentByKey[P] | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cvy_site_content')
    .select('key, value')
    .in('key', keys as readonly string[]);

  if (error) {
    console.error('fetchContent error:', error.message);
    return Object.fromEntries(keys.map((k) => [k, null])) as {
      [P in K]: ContentByKey[P] | null;
    };
  }

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return Object.fromEntries(
    keys.map((k) => [k, (map[k] ?? null) as ContentByKey[K] | null])
  ) as { [P in K]: ContentByKey[P] | null };
}
