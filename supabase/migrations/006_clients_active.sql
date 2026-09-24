-- CV Yard Works — Clients & Routes: inactive clients stay in the list but are
-- left out of route planning and load totals. Run once in the SQL Editor.

alter table public.cvy_clients
  add column if not exists active boolean not null default true;
