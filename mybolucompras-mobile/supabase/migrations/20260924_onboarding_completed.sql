-- supabase/migrations/20260924_onboarding_completed.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: public.configuracion_usuario must already exist.
--
-- AuthContext.necesitaOnboarding() selects this column; while it's missing the
-- select fails and the onboarding is never shown (not even to new users).
-- completeOnboarding() also upserts it, and was silently failing until now.

ALTER TABLE public.configuracion_usuario
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Todas las filas existentes son de usuarios que ya usaron la app. Se marcan
-- como completadas para que nadie vuelva a caer en el onboarding, incluidos los
-- usuarios cuya config quedó vacía por el bug que pisaba la fila entera.
UPDATE public.configuracion_usuario
  SET onboarding_completed = true
  WHERE onboarding_completed = false;

-- PostgREST caches the table schema; without this, supabase-js reads/writes to
-- the new column fail with "column not found in schema cache" until the cache
-- next auto-refreshes.
NOTIFY pgrst, 'reload schema';
