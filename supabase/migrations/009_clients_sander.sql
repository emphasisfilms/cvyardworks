-- CV Yard Works — Clients & Routes: property needs a truck with a sander when plowed.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.cvy_clients
  add column if not exists sander boolean not null default false;
