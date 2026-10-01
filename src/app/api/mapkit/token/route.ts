import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { appleMapsReady, mapkitToken } from '@/lib/apple-maps';

// Hands the admin's browser a short-lived Apple Maps token. Signed-in admins only.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Not signed in', { status: 401 });
  if (!appleMapsReady()) return new NextResponse('Apple Maps is not configured', { status: 503 });
  // The address the browser sees (not an internal one), which is what Apple
  // compares the token's origin against.
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  try {
    return new NextResponse(mapkitToken(`${proto}://${host}`), {
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new NextResponse('Could not sign an Apple Maps token (check the private key)', { status: 500 });
  }
}
