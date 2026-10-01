-- CV Yard Works — pull GPS data every 10 minutes.
-- Run AFTER a manual "Sync now" works on the Trucks & GPS page and
-- SUPABASE_SERVICE_ROLE_KEY is set on Vercel. Safe to re-run.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'cvy-fleet-sync';

select cron.schedule(
  'cvy-fleet-sync',
  '*/10 * * * *',
  $$ select net.http_get(
       url := 'https://www.cvyardworks.com/api/fleet/sync',
       timeout_milliseconds := 55000
     ) $$
);
