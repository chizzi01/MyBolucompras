-- supabase/migrations/20260722_viaje_calendario_cron.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: the `send-daily-viaje-summary` Edge Function must already be deployed
-- (supabase functions deploy send-daily-viaje-summary), and its CRON_SECRET /
-- GOOGLE_SERVICE_ACCOUNT / SUPABASE_SERVICE_ROLE_KEY secrets must already be set
-- (supabase secrets set CRON_SECRET=<your-generated-secret>).
--
-- Before running, replace the two placeholders below:
--   <PROJECT_REF>   — your Supabase project ref (from the project URL / dashboard settings)
--   <CRON_SECRET>   — the exact same value you set via `supabase secrets set CRON_SECRET=...`

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'viaje-daily-summary',
  '0 11 * * *', -- 11:00 UTC = 08:00 America/Argentina/Buenos_Aires (fixed UTC-3, no DST)
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-viaje-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
