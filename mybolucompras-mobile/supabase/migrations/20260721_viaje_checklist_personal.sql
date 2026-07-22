-- supabase/migrations/20260721_viaje_checklist_personal.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: public.viaje_checklist must already exist (see 20260528_modo_viaje.sql).

-- 1. Tipo de ítem: 'general' (requiere confirmación de todo el grupo, comportamiento
--    actual) o 'personal' (solo lo ve y lo marca quien lo creó).
ALTER TABLE public.viaje_checklist
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'general'
  CHECK (tipo IN ('general', 'personal'));

-- 2. RLS: reemplazar la policy única "vc_all" por 4 policies que distinguen
--    general (todo participante) de personal (solo el creador).
DROP POLICY IF EXISTS "vc_all" ON public.viaje_checklist;

CREATE POLICY "vc_select" ON public.viaje_checklist FOR SELECT
  USING (
    (tipo = 'general' AND viaje_id IN (
      SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()
    ))
    OR (tipo = 'personal' AND created_by = auth.uid())
  );

CREATE POLICY "vc_insert" ON public.viaje_checklist FOR INSERT
  WITH CHECK (
    viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid())
    AND (tipo = 'general' OR created_by = auth.uid())
  );

CREATE POLICY "vc_update" ON public.viaje_checklist FOR UPDATE
  USING (
    (tipo = 'general' AND viaje_id IN (
      SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()
    ))
    OR (tipo = 'personal' AND created_by = auth.uid())
  );

CREATE POLICY "vc_delete" ON public.viaje_checklist FOR DELETE
  USING (created_by = auth.uid());
