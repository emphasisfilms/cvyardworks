-- CV Yard Works — Clients & Routes: teams are numbered 1–6 and a property can
-- require its current team. Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.cvy_clients
  add column if not exists team_required boolean not null default false;
