-- =============================================================
-- CV Yard Works — GPS capture from Spireon FleetLocate
--
-- cvy_vehicles     one row per truck (Spireon asset), with an optional team
-- cvy_gps_events   every raw event Spireon reports (the source of truth)
-- cvy_visits       stops derived from the events, matched to client pins
-- cvy_gps_sync_log one row per sync run, for troubleshooting
--
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- =============================================================

create table if not exists public.cvy_vehicles (
  id             text primary key,            -- Spireon asset id
  name           text not null default '',
  vin            text,
  make           text,
  model          text,
  year           text,
  team           text,                        -- team number; assign whenever known
  active         boolean not null default true,
  status         text,
  speed          int,
  lat            double precision,
  lng            double precision,
  address        text,
  last_reported  timestamptz,
  odometer       double precision,
  engine_hours   double precision,
  last_event_at  timestamptz,                 -- forward-sync cursor
  backfill_day   date,                        -- next (older) day still to backfill
  backfill_done  boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.cvy_gps_events (
  id            text primary key,             -- Spireon event id
  vehicle_id    text not null references public.cvy_vehicles(id) on delete cascade,
  type          text not null,                -- MOVE_START, MOVE_STOP, AUTO_LOC, IGN_ON …
  at            timestamptz not null,
  lat           double precision,
  lng           double precision,
  speed         int,
  heading       real,
  odometer      double precision,
  engine_hours  double precision,
  address       text,
  data          jsonb                         -- event-specific extras, when present
);

create index if not exists cvy_gps_events_vehicle_at_idx on public.cvy_gps_events (vehicle_id, at);
create index if not exists cvy_gps_events_at_idx on public.cvy_gps_events (at);

create table if not exists public.cvy_visits (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   text not null references public.cvy_vehicles(id) on delete cascade,
  client_id    uuid references public.cvy_clients(id) on delete set null,
  kind         text not null default 'other',  -- client | shop | other
  arrived_at   timestamptz not null,
  departed_at  timestamptz,                    -- null while the truck is still there
  minutes      int,
  lat          double precision,
  lng          double precision,
  address      text,
  unique (vehicle_id, arrived_at)
);

create index if not exists cvy_visits_client_idx  on public.cvy_visits (client_id, arrived_at);
create index if not exists cvy_visits_arrived_idx on public.cvy_visits (arrived_at);

create table if not exists public.cvy_gps_sync_log (
  id             bigserial primary key,
  ran_at         timestamptz not null default now(),
  source         text,                         -- cron | manual
  vehicles       int,
  events         int,
  backfill_days  int,
  visits         int,
  ms             int,
  error          text
);

drop trigger if exists cvy_vehicles_updated_at on public.cvy_vehicles;
create trigger cvy_vehicles_updated_at
  before update on public.cvy_vehicles
  for each row execute function public.cvy_set_updated_at();

-- Private operational data: signed-in admins only. The background sync uses
-- the service role, which bypasses RLS.
alter table public.cvy_vehicles     enable row level security;
alter table public.cvy_gps_events   enable row level security;
alter table public.cvy_visits       enable row level security;
alter table public.cvy_gps_sync_log enable row level security;

drop policy if exists "cvy_vehicles auth all"     on public.cvy_vehicles;
drop policy if exists "cvy_gps_events auth all"   on public.cvy_gps_events;
drop policy if exists "cvy_visits auth all"       on public.cvy_visits;
drop policy if exists "cvy_gps_sync_log auth all" on public.cvy_gps_sync_log;
create policy "cvy_vehicles auth all"     on public.cvy_vehicles     for all to authenticated using (true) with check (true);
create policy "cvy_gps_events auth all"   on public.cvy_gps_events   for all to authenticated using (true) with check (true);
create policy "cvy_visits auth all"       on public.cvy_visits       for all to authenticated using (true) with check (true);
create policy "cvy_gps_sync_log auth all" on public.cvy_gps_sync_log for all to authenticated using (true) with check (true);

-- Where the trucks start and end the day. 7 Levi Ln is private land, so the
-- radius is generous; it can be re-centered from the Trucks & GPS page.
insert into public.cvy_site_content (key, value) values
  ('shop_location', jsonb_build_object(
    'address', '7 Levi Ln, Walpole, NH 03608',
    'lat', 43.0903376,
    'lng', -72.4172135,
    'radius_m', 250
  ))
on conflict (key) do nothing;
