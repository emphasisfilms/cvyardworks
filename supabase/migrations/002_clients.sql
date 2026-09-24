-- =============================================================
-- CV Yard Works — client / route table for the admin "Clients & Routes" page
--
-- Run this once in the SQL Editor of the shared Supabase project.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =============================================================

create table if not exists public.cvy_clients (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  address          text not null default '',
  service_minutes  int,            -- how long a visit takes, in minutes
  required_day     text,           -- 'Mon'..'Sun', or null = any day
  current_day      text,           -- day currently scheduled
  current_team     text,           -- crew currently assigned, free text
  notes            text,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists cvy_clients_day_idx  on public.cvy_clients (current_day);
create index if not exists cvy_clients_team_idx on public.cvy_clients (current_team);

drop trigger if exists cvy_clients_updated_at on public.cvy_clients;
create trigger cvy_clients_updated_at
  before update on public.cvy_clients
  for each row execute function public.cvy_set_updated_at();

-- Client data is private: signed-in admins only, no public read.
alter table public.cvy_clients enable row level security;

drop policy if exists "cvy_clients auth all" on public.cvy_clients;
create policy "cvy_clients auth all"
  on public.cvy_clients for all
  to authenticated using (true) with check (true);
