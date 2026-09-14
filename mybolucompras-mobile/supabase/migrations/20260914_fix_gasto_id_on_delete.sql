-- supabase/migrations/20260914_fix_gasto_id_on_delete.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
--
-- Bug: notificaciones_pendientes.gasto_id REFERENCES public.gastos(id) sin
-- ON DELETE especificado (default NO ACTION). Al confirmar una compra
-- detectada se completa ese gasto_id, y desde ese momento el gasto real
-- correspondiente no se puede borrar: Postgres rechaza el DELETE por violar
-- la foreign key ("update or delete on table gastos violates foreign key
-- constraint"). Se cambia a ON DELETE SET NULL: si el usuario borra el
-- gasto, la fila de notificaciones_pendientes se conserva (como registro de
-- que la compra fue confirmada en su momento) pero gasto_id queda en null.

ALTER TABLE public.notificaciones_pendientes
  DROP CONSTRAINT IF EXISTS notificaciones_pendientes_gasto_id_fkey;

ALTER TABLE public.notificaciones_pendientes
  ADD CONSTRAINT notificaciones_pendientes_gasto_id_fkey
  FOREIGN KEY (gasto_id) REFERENCES public.gastos(id) ON DELETE SET NULL;
