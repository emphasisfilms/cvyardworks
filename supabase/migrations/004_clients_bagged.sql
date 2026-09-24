-- CV Yard Works — Clients & Routes: flag properties whose clippings must be bagged.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.cvy_clients
  add column if not exists bagged boolean not null default false;
