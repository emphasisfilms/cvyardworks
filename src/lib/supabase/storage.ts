export const PHOTO_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'cvy-site-photos';

export function getPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}
