-- supabase/migrations/20260528_modo_viaje.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: The public.gastos table must already exist before running this migration.
-- This migration creates Modo Viaje (trip mode) tables that reference public.gastos via
-- foreign key constraints in the viaje_gastos table.

-- 1. viajes
CREATE TABLE IF NOT EXISTS public.viajes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       text        NOT NULL,
  emoji        text        NOT NULL DEFAULT '✈️',
  created_by   uuid        REFERENCES auth.users NOT NULL,
  estado       text        NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado')),
  fecha_cierre timestamp,
  created_at   timestamp   DEFAULT now()
);

-- 2. viaje_participantes
CREATE TABLE IF NOT EXISTS public.viaje_participantes (
  id         uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id   uuid  REFERENCES public.viajes(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid  REFERENCES auth.users NOT NULL,
  joined_at  timestamp DEFAULT now(),
  UNIQUE(viaje_id, user_id)
);
-- FK to public.profiles so PostgREST schema cache can resolve the join
-- viaje_participantes(user_id, profiles:user_id(id, nombre, email))
ALTER TABLE public.viaje_participantes
  ADD CONSTRAINT viaje_participantes_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 3. viaje_gastos
CREATE TABLE IF NOT EXISTS public.viaje_gastos (
  id             uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id       uuid  REFERENCES public.viajes(id) ON DELETE CASCADE NOT NULL,
  gasto_id       uuid  REFERENCES public.gastos(id) ON DELETE CASCADE NOT NULL,
  pagado_por     uuid  REFERENCES auth.users NOT NULL,
  modo_split     text  NOT NULL CHECK (modo_split IN ('solo', 'todos', 'algunos')),
  participantes  uuid[],
  created_at     timestamp DEFAULT now()
);
ALTER TABLE public.viaje_gastos
  ADD CONSTRAINT viaje_gastos_pagado_por_profile_fkey
  FOREIGN KEY (pagado_por) REFERENCES public.profiles(id);

-- 4. viaje_checklist
CREATE TABLE IF NOT EXISTS public.viaje_checklist (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id    uuid    REFERENCES public.viajes(id) ON DELETE CASCADE NOT NULL,
  texto       text    NOT NULL,
  completado  boolean NOT NULL DEFAULT false,
  created_by  uuid    REFERENCES auth.users NOT NULL,
  created_at  timestamp DEFAULT now()
);
ALTER TABLE public.viaje_checklist
  ADD CONSTRAINT viaje_checklist_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- 5. viaje_notas
CREATE TABLE IF NOT EXISTS public.viaje_notas (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id    uuid  REFERENCES public.viajes(id) ON DELETE CASCADE NOT NULL,
  texto       text  NOT NULL,
  created_by  uuid  REFERENCES auth.users NOT NULL,
  created_at  timestamp DEFAULT now()
);
ALTER TABLE public.viaje_notas
  ADD CONSTRAINT viaje_notas_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.viajes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viaje_participantes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viaje_gastos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viaje_checklist      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viaje_notas          ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper: queries viaje_participantes bypassing its own RLS policies,
-- which breaks the mutual recursion between viajes_select and vp_select.
-- Without this, the chain vp_insert→viajes_select→vp_select→viajes_select loops infinitely.
CREATE OR REPLACE FUNCTION public.is_viaje_participant(viaje_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.viaje_participantes
    WHERE viaje_id = viaje_uuid AND user_id = auth.uid()
  );
$$;

-- viajes: participants can SELECT; only creator can UPDATE/DELETE.
-- created_by = auth.uid() allows the creator to SELECT immediately after INSERT,
-- before their viaje_participantes row is committed.
CREATE POLICY "viajes_select" ON public.viajes FOR SELECT
  USING (created_by = auth.uid() OR is_viaje_participant(id));
CREATE POLICY "viajes_insert" ON public.viajes FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "viajes_update" ON public.viajes FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "viajes_delete" ON public.viajes FOR DELETE USING (created_by = auth.uid());

-- viaje_participantes: avoid self-referential loop — allow if own row OR creator of viaje
CREATE POLICY "vp_select" ON public.viaje_participantes FOR SELECT
  USING (user_id = auth.uid()
    OR viaje_id IN (SELECT id FROM public.viajes WHERE created_by = auth.uid()));
CREATE POLICY "vp_insert" ON public.viaje_participantes FOR INSERT
  WITH CHECK (viaje_id IN (SELECT id FROM public.viajes WHERE created_by = auth.uid()));
CREATE POLICY "vp_delete" ON public.viaje_participantes FOR DELETE
  USING (viaje_id IN (SELECT id FROM public.viajes WHERE created_by = auth.uid()));

-- viaje_gastos, viaje_checklist, viaje_notas: participants only
CREATE POLICY "vg_all" ON public.viaje_gastos
  USING (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()))
  WITH CHECK (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));

CREATE POLICY "vc_all" ON public.viaje_checklist
  USING (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()))
  WITH CHECK (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));

CREATE POLICY "vn_all" ON public.viaje_notas
  USING (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()))
  WITH CHECK (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));

-- ── INDEXES ──────────────────────────────────────────────────────────────────
-- Indexes for RLS subquery performance. Critical for performance because every
-- SELECT/INSERT/UPDATE/DELETE runs RLS policy checks that reference these columns.

CREATE INDEX IF NOT EXISTS idx_vp_user_id ON public.viaje_participantes(user_id);
CREATE INDEX IF NOT EXISTS idx_vp_viaje_id ON public.viaje_participantes(viaje_id);
CREATE INDEX IF NOT EXISTS idx_vg_viaje_id ON public.viaje_gastos(viaje_id);
CREATE INDEX IF NOT EXISTS idx_vc_viaje_id ON public.viaje_checklist(viaje_id);
CREATE INDEX IF NOT EXISTS idx_vn_viaje_id ON public.viaje_notas(viaje_id);
