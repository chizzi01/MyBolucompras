-- supabase/migrations/20260912_notificaciones_pendientes.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.

CREATE TABLE IF NOT EXISTS public.notificaciones_pendientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  banco text,
  banco_package text,
  texto_raw text NOT NULL,
  monto numeric,
  moneda text,
  comercio_raw text,
  ultimos4 text,
  medio text,
  tipo text CHECK (tipo IN ('debito', 'credito') OR tipo IS NULL),
  fuente text CHECK (fuente IN ('regla', 'ia')),
  fecha_detectada timestamptz NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'descartado')),
  gasto_id uuid REFERENCES public.gastos(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_pendientes_user_estado
  ON public.notificaciones_pendientes(user_id, estado);

ALTER TABLE public.notificaciones_pendientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "np_select" ON public.notificaciones_pendientes FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "np_insert" ON public.notificaciones_pendientes FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "np_update" ON public.notificaciones_pendientes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "np_delete" ON public.notificaciones_pendientes FOR DELETE
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.comercios_aprendidos (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  comercio_raw text NOT NULL,
  etiqueta text,
  medio_pago text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comercio_raw)
);

ALTER TABLE public.comercios_aprendidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ca_select" ON public.comercios_aprendidos FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "ca_upsert" ON public.comercios_aprendidos FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "ca_update" ON public.comercios_aprendidos FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
