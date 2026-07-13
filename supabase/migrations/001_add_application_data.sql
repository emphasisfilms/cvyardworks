-- =============================================================
-- CV Yard Works — add application_data column for hire applications
--
-- NOTE: already applied to the live project AND folded into schema.sql
-- (which now declares this column directly). Kept for history; running
-- it again is a no-op.
-- =============================================================

alter table public.cvy_messages
  add column if not exists application_data jsonb;
