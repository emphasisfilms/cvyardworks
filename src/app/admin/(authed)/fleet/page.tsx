import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fleetLocateReady } from '@/lib/fleetlocate';
import type { TeamRow } from '@/lib/supabase/content-types';
import FleetPanel, { type LogRow, type VehicleView, type VisitView } from './FleetPanel';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function AdminFleetPage() {
  const supabase = await createSupabaseServerClient();

  const [vehiclesRes, teamsRes, logRes, visitsRes, shopRes, totalRes] = await Promise.all([
    supabase.from('cvy_vehicles').select('*').order('name'),
    supabase.from('cvy_teams').select('*').eq('active', true).order('number'),
    supabase.from('cvy_gps_sync_log').select('*').order('ran_at', { ascending: false }).limit(6),
    supabase
      .from('cvy_visits')
      .select('id, vehicle_id, client_id, kind, arrived_at, departed_at, minutes, address')
      .order('arrived_at', { ascending: false })
      .limit(40),
    supabase.from('cvy_site_content').select('value').eq('key', 'shop_location').maybeSingle(),
    supabase.from('cvy_gps_events').select('id', { count: 'exact', head: true }),
  ]);

  const missingTable = vehiclesRes.error?.code === '42P01';

  const vehicleRows = vehiclesRes.data ?? [];
  // Stored events per truck.
  const counts = await Promise.all(
    vehicleRows.map((v) =>
      supabase.from('cvy_gps_events').select('id', { count: 'exact', head: true }).eq('vehicle_id', v.id)
    )
  );

  const vehicles: VehicleView[] = vehicleRows.map((v, i) => ({
    id: v.id,
    name: v.name,
    vehicle: [v.year, v.make, v.model].filter(Boolean).join(' '),
    team: v.team ?? null,
    status: v.status ?? 'Unknown',
    address: v.address ?? null,
    lastReported: v.last_reported ?? null,
    events: counts[i].count ?? 0,
    backfillDay: v.backfill_day ?? null,
    backfillDone: v.backfill_done === true,
  }));

  // Names for the recent-visits list.
  const clientIds = Array.from(new Set((visitsRes.data ?? []).map((v) => v.client_id).filter(Boolean))) as string[];
  const { data: clientRows } = clientIds.length
    ? await supabase.from('cvy_clients').select('id, name').in('id', clientIds)
    : { data: [] as { id: string; name: string }[] };
  const clientName = new Map((clientRows ?? []).map((c) => [c.id, c.name]));
  const vehicleName = new Map(vehicleRows.map((v) => [v.id, v.name]));

  const visits: VisitView[] = (visitsRes.data ?? []).map((v) => ({
    id: v.id,
    truck: vehicleName.get(v.vehicle_id) ?? v.vehicle_id,
    place:
      v.kind === 'client'
        ? clientName.get(v.client_id) ?? 'Client'
        : v.kind === 'shop'
          ? 'Shop'
          : v.address ?? 'Unknown location',
    kind: v.kind,
    arrivedAt: v.arrived_at,
    departedAt: v.departed_at,
    minutes: v.minutes,
  }));

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Trucks &amp; GPS</h1>
          <p className="admin-page-subtitle">
            Everything FleetLocate reports is saved here: every start, stop and location ping per
            truck. Stops are matched to client pins to build a visit log.
          </p>
        </div>
      </div>

      {missingTable && (
        <div className="admin-notice">
          The GPS tables have not been created yet. In the Supabase SQL Editor run{' '}
          <code>supabase/migrations/010_fleet.sql</code> once, then reload this page.
        </div>
      )}
      {!missingTable && vehiclesRes.error && (
        <div className="admin-notice">Couldn’t load trucks: {vehiclesRes.error.message}</div>
      )}

      <FleetPanel
        vehicles={vehicles}
        teams={((teamsRes.data ?? []) as TeamRow[])}
        log={(logRes.data ?? []) as LogRow[]}
        visits={visits}
        shop={(shopRes.data?.value ?? null) as { address: string; lat: number; lng: number; radius_m: number } | null}
        totalEvents={totalRes.count ?? 0}
        fleetReady={fleetLocateReady()}
        cronReady={!!process.env.SUPABASE_SERVICE_ROLE_KEY}
        disabled={!!vehiclesRes.error}
      />
    </>
  );
}
