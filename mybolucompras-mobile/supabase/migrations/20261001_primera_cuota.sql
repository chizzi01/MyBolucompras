-- supabase/migrations/20261001_primera_cuota.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- Mes (YYYY-MM) en que se cobra la primera cuota de un gasto/deuda en crédito.
-- Hasta ahora cada teléfono lo recalculaba con las fechas de SU tarjeta, así que
-- en un gasto compartido cada persona podía ver una cuota distinta, y una config
-- de tarjeta mal cargada desfasaba todas las compras viejas. Ahora se fija una vez,
-- con la tarjeta de quien hizo la compra, y la app solo lo lee.
--
-- Misma lógica que indicePrimeraCuota() en src/utils/cuotas.js: la compra entra en
-- el primer cierre >= fecha de compra y se cobra en el vencimiento de ese resumen.

ALTER TABLE public.gastos    ADD COLUMN IF NOT EXISTS primera_cuota text;
ALTER TABLE public.deudores  ADD COLUMN IF NOT EXISTS primera_cuota text;

CREATE OR REPLACE FUNCTION public.calcular_primera_cuota(p_fecha date, p_owner uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  c0 date; v0 date; c1 date; v1 date; k int;
BEGIN
  IF p_fecha IS NULL THEN RETURN NULL; END IF;

  SELECT nullif(cierre::text, '')::date, nullif(vencimiento::text, '')::date,
         nullif(cierre_anterior::text, '')::date, nullif(vencimiento_anterior::text, '')::date
    INTO c1, v1, c0, v0
    FROM configuracion_usuario WHERE user_id::text = p_owner::text;

  -- Sin tarjeta configurada (o inconsistente): primera cuota = mes de compra.
  IF c1 IS NULL OR v1 IS NULL OR (v1 - c1) NOT BETWEEN 1 AND 25 THEN
    RETURN to_char(p_fecha, 'YYYY-MM');
  END IF;

  IF c0 IS NULL OR v0 IS NULL OR (v0 - c0) NOT BETWEEN 1 AND 25 OR (c1 - c0) NOT BETWEEN 20 AND 45 THEN
    c0 := (c1 - interval '1 month')::date;
    v0 := (v1 - interval '1 month')::date;
  END IF;

  IF p_fecha > c1 THEN
    k := 1;
    WHILE p_fecha > (c1 + make_interval(months => k))::date AND k < 600 LOOP k := k + 1; END LOOP;
    RETURN to_char(v1 + make_interval(months => k), 'YYYY-MM');
  END IF;

  IF p_fecha > c0 THEN RETURN to_char(v1, 'YYYY-MM'); END IF;

  k := 0;
  WHILE p_fecha <= (c0 - make_interval(months => k + 1))::date AND k < 600 LOOP k := k + 1; END LOOP;
  RETURN to_char(v0 - make_interval(months => k), 'YYYY-MM');
END $$;

-- Quien inserta es quien hizo la compra (también cuando crea la copia del gasto
-- compartido para la otra persona), así que se usa su tarjeta: auth.uid().
CREATE OR REPLACE FUNCTION public.set_primera_cuota_gasto()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.es_fijo, false) OR NEW.tipo IS DISTINCT FROM 'credito' THEN
    NEW.primera_cuota := NULL;
  ELSIF TG_OP = 'INSERT' OR NEW.primera_cuota IS NULL
     OR NEW.fecha IS DISTINCT FROM OLD.fecha OR OLD.tipo IS DISTINCT FROM 'credito' THEN
    NEW.primera_cuota := calcular_primera_cuota(nullif(NEW.fecha::text, '')::date, coalesce(auth.uid(), NEW.user_id::uuid));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_primera_cuota_deuda()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.es_fijo, false) OR NEW.tipo IS DISTINCT FROM 'credito' THEN
    NEW.primera_cuota := NULL;
  ELSIF TG_OP = 'INSERT' OR NEW.primera_cuota IS NULL
     OR NEW.fecha_deuda IS DISTINCT FROM OLD.fecha_deuda OR OLD.tipo IS DISTINCT FROM 'credito' THEN
    NEW.primera_cuota := calcular_primera_cuota(nullif(NEW.fecha_deuda::text, '')::date, coalesce(auth.uid(), NEW.user_id::uuid));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_primera_cuota_gasto ON public.gastos;
CREATE TRIGGER trg_primera_cuota_gasto
  BEFORE INSERT OR UPDATE ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION public.set_primera_cuota_gasto();

DROP TRIGGER IF EXISTS trg_primera_cuota_deuda ON public.deudores;
CREATE TRIGGER trg_primera_cuota_deuda
  BEFORE INSERT OR UPDATE ON public.deudores
  FOR EACH ROW EXECUTE FUNCTION public.set_primera_cuota_deuda();

-- Backfill con la tarjeta de quien hizo la compra:
--  gastos: la copia recibida de otro ("(Compartido por …)" o con una deuda mía
--          donde yo soy deudor del mismo gasto) usa la tarjeta del otro.
--  deudas: si soy deudor de alguien de la app, la compra fue con su tarjeta.
UPDATE public.gastos g
SET primera_cuota = calcular_primera_cuota(
  nullif(g.fecha::text, '')::date,
  CASE WHEN nullif(g.compartido_con_user_id::text, '') IS NOT NULL AND (
         g.objeto LIKE '%(Compartido por %)'
         OR EXISTS (
           SELECT 1 FROM public.deudores d
           WHERE d.user_id::text = g.user_id::text
             AND d.compartido_con_user_id::text = g.compartido_con_user_id::text
             AND d.fecha_deuda::text = g.fecha::text
             AND d.es_acreedor = false))
       THEN g.compartido_con_user_id::uuid ELSE g.user_id::uuid END)
WHERE g.tipo = 'credito' AND NOT coalesce(g.es_fijo, false);

UPDATE public.deudores d
SET primera_cuota = calcular_primera_cuota(
  nullif(d.fecha_deuda::text, '')::date,
  CASE WHEN d.es_acreedor = false AND nullif(d.compartido_con_user_id::text, '') IS NOT NULL
       THEN d.compartido_con_user_id::uuid ELSE d.user_id::uuid END)
WHERE d.tipo = 'credito' AND NOT coalesce(d.es_fijo, false);

NOTIFY pgrst, 'reload schema';
