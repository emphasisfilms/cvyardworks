-- =============================================================
-- CV Yard Works — add application_data column for hire applications
--
-- Run this in the snowplowsales Supabase project's SQL Editor.
-- Safe to re-run.
-- =============================================================

alter table public.cvy_messages
  add column if not exists application_data jsonb;
