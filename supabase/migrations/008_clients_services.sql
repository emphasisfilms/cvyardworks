-- CV Yard Works — Clients & Routes: which services each property gets.
-- Existing clients are mowing clients, so mow defaults on and plow off.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.cvy_clients
  add column if not exists mow  boolean not null default true,   -- summer service
  add column if not exists plow boolean not null default false;  -- winter service
