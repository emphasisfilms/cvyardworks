-- CV Yard Works — a truck often parks centrally and the crew services several
-- nearby clients from that one spot. Each stop therefore records every client
-- in reach, with the stop's time shared between them.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.cvy_visits
  add column if not exists clients jsonb;   -- [{ id, m (metres away), min (share of the stop) }]
