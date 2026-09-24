-- CV Yard Works — Clients & Routes map: store each address's coordinates.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.cvy_clients
  add column if not exists lat            double precision,
  add column if not exists lng            double precision,
  add column if not exists geocode_status text,          -- 'ok' | 'failed' | 'manual' | null (not tried yet)
  add column if not exists geocoded_at    timestamptz;
