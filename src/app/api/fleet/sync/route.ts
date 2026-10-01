import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fleetLocateReady } from '@/lib/fleetlocate';
import { runFleetSync } from '@/lib/fleet-sync';

// Called every 10 minutes by a Supabase timer (see supabase/migrations/011_fleet_cron.sql).
// Public on purpose: it returns only counts, and refuses to run more than
// once every 90 seconds, so there is nothing to gain by calling it.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not set on Vercel.' },
      { status: 503 }
    );
  }
  if (!fleetLocateReady()) {
    return NextResponse.json({ ok: false, error: 'FleetLocate credentials are not set.' }, { status: 503 });
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const res = await runFleetSync(db, { source: 'cron', budgetMs: 45000, minIntervalSec: 90 });
  // Never echo upstream error text to the public.
  return NextResponse.json({
    ok: res.ok,
    skipped: res.skipped ?? null,
    vehicles: res.vehicles,
    events: res.events,
    backfillDays: res.backfillDays,
    visits: res.visits,
    ms: res.ms,
  });
}

export const GET = handle;
export const POST = handle;
