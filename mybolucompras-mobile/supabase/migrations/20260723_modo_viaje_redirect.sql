-- supabase/migrations/20260723_modo_viaje_redirect.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: public.configuracion_usuario and public.viajes must already exist.

ALTER TABLE public.configuracion_usuario
  ADD COLUMN IF NOT EXISTS modo_viaje_activo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modo_viaje_viaje_id uuid NULL REFERENCES public.viajes(id),
  ADD COLUMN IF NOT EXISTS modo_viaje_prompted_ids uuid[] NOT NULL DEFAULT '{}';
