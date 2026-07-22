-- supabase/migrations/20260722_viaje_calendario.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: public.viajes and public.viaje_participantes must already exist
-- (see 20260528_modo_viaje.sql).

-- 1. Trip date range, set at creation or via edit, both nullable.
ALTER TABLE public.viajes
  ADD COLUMN IF NOT EXISTS fecha_desde date,
  ADD COLUMN IF NOT EXISTS fecha_hasta date;

-- 2. viaje_actividades: shared itinerary items for a specific day of the trip.
CREATE TABLE IF NOT EXISTS public.viaje_actividades (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id    uuid  REFERENCES public.viajes(id) ON DELETE CASCADE NOT NULL,
  fecha       date  NOT NULL,
  hora        time  NULL,
  titulo      text  NOT NULL,
  ubicacion   text  NULL,
  nota        text  NULL,
  created_by  uuid  REFERENCES auth.users NOT NULL,
  created_at  timestamp DEFAULT now()
);
ALTER TABLE public.viaje_actividades
  ADD CONSTRAINT viaje_actividades_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.viaje_actividades ENABLE ROW LEVEL SECURITY;

-- Shared across all participants — no personal/general split, unlike viaje_checklist.
CREATE POLICY "va_all" ON public.viaje_actividades
  USING (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()))
  WITH CHECK (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_va_viaje_id ON public.viaje_actividades(viaje_id);
CREATE INDEX IF NOT EXISTS idx_va_viaje_fecha ON public.viaje_actividades(viaje_id, fecha);
