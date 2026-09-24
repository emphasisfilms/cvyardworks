-- CV Yard Works — Clients & Routes: which services each property gets.
-- Both default on: most properties get mowing and plowing.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.cvy_clients
  add column if not exists mow  boolean not null default true,  -- summer service
  add column if not exists plow boolean not null default true;  -- winter service

-- If the column was created earlier with a false default, correct it:
alter table public.cvy_clients alter column plow set default true;
