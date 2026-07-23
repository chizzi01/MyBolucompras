-- supabase/migrations/20260723_modo_viaje_redirect.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: public.configuracion_usuario and public.viajes must already exist.
--
-- DEPLOYMENT ORDER: apply this migration BEFORE shipping the corresponding app
-- update. configuracionService.js's mapToDB() unconditionally writes these three
-- columns on every configuracion_usuario upsert, so if the app code ships first,
-- ALL config saves (not just Modo Viaje) will fail with "column does not exist".

ALTER TABLE public.configuracion_usuario
  ADD COLUMN IF NOT EXISTS modo_viaje_activo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modo_viaje_viaje_id uuid NULL REFERENCES public.viajes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modo_viaje_prompted_ids uuid[] NOT NULL DEFAULT '{}';
