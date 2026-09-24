-- CV Yard Works — crews / teams table for the admin "Crews & Teams" page.
-- Drives the Current team dropdown on Clients & Routes.
-- Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.cvy_teams (
  id           uuid primary key default gen_random_uuid(),
  number       int  not null unique,      -- the team number shown everywhere (1, 2, 3 …)
  name         text not null default '',  -- optional label, e.g. "North crew"
  lead_name    text not null default '',
  lead_phone   text not null default '',
  has_bagger   boolean not null default false,  -- can take Bagged properties
  active       boolean not null default true,   -- inactive teams are hidden from dropdowns
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists cvy_teams_updated_at on public.cvy_teams;
create trigger cvy_teams_updated_at
  before update on public.cvy_teams
  for each row execute function public.cvy_set_updated_at();

alter table public.cvy_teams enable row level security;

drop policy if exists "cvy_teams auth all" on public.cvy_teams;
create policy "cvy_teams auth all"
  on public.cvy_teams for all
  to authenticated using (true) with check (true);

-- Start with the six teams that already exist in the Clients dropdown.
insert into public.cvy_teams (number) values (1), (2), (3), (4), (5), (6)
on conflict (number) do nothing;
