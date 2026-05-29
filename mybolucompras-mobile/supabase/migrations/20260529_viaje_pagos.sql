-- supabase/migrations/20260529_viaje_pagos.sql
-- NOTE: Run manually in Supabase Dashboard SQL Editor.

-- 1. Agregar columnas de expense data a viaje_gastos
ALTER TABLE public.viaje_gastos
  ADD COLUMN IF NOT EXISTS objeto text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS precio numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha date,
  ADD COLUMN IF NOT EXISTS etiqueta text;

-- Hacer gasto_id nullable (antes era NOT NULL)
ALTER TABLE public.viaje_gastos
  ALTER COLUMN gasto_id DROP NOT NULL;

-- Backfill: copiar datos de gastos existentes a viaje_gastos.
-- El precio antiguo era por-persona (total/n), así que se reconstruye el total.
-- Corre como admin en SQL Editor → bypasea RLS de gastos.
UPDATE public.viaje_gastos vg
SET
  objeto = g.objeto,
  precio = g.precio * GREATEST(array_length(vg.participantes, 1), 1),
  fecha  = g.fecha::date,
  etiqueta = COALESCE(g.etiqueta, '')
FROM public.gastos g
WHERE vg.gasto_id = g.id
  AND vg.objeto = '';  -- Solo filas no migradas todavía

-- 2. Agregar campos viaje a gastos (para los gastos resumen al cerrar)
ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS viaje_id uuid REFERENCES public.viajes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS viaje_nombre text;

CREATE INDEX IF NOT EXISTS idx_gastos_viaje_id ON public.gastos(viaje_id);

-- 3. Crear tabla viaje_pagos
CREATE TABLE IF NOT EXISTS public.viaje_pagos (
  id           uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id     uuid      REFERENCES public.viajes(id) ON DELETE CASCADE NOT NULL,
  pagador_id   uuid      REFERENCES public.profiles(id) NOT NULL,
  receptor_id  uuid      REFERENCES public.profiles(id) NOT NULL,
  monto        numeric   NOT NULL,
  fecha        timestamp DEFAULT now(),
  created_at   timestamp DEFAULT now()
);

ALTER TABLE public.viaje_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vpagos_all" ON public.viaje_pagos
  USING (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()))
  WITH CHECK (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_viaje_pagos_viaje_id ON public.viaje_pagos(viaje_id);
