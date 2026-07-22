# Viaje Calendario — Design Spec

Date: 2026-07-22

## Summary

Add a "Calendario" section to a viaje (trip) where participants can see the trip's date range as a day-by-day itinerary and add scheduled activities (title, time, location, note) to any day. Each morning, participants who have that day within their trip's date range receive a push notification summarizing that day's activities.

## Scope

- Trip date range (`fecha_desde` / `fecha_hasta`) set at creation and editable afterward.
- New "Calendario" tab in `ViajeDetailScreen`, alongside Gastos / Balance / Notas.
- Activities are shared across all trip participants (no personal/general split, unlike the checklist).
- A server-side daily cron sends a push notification at 08:00 America/Argentina/Buenos_Aires summarizing the day's activities, only to trips active that day and only when activities exist.

Out of scope: recurring activities, activity reminders at custom times, drag-to-reorder, calendar sync (Google/iCal export), timezone-per-trip configuration (fixed to Argentina timezone, consistent with the rest of the app).

## 1. Trip date range

### Data
`public.viajes` gets two new nullable columns:
- `fecha_desde date`
- `fecha_hasta date`

Both nullable — existing trips and newly created trips without dates keep working; the Calendario tab handles the "no dates set" case with an empty state.

### Creation
`CrearViajeModal` gains two optional date fields ("Desde" / "Hasta") using the existing `@react-native-community/datetimepicker` (already used elsewhere in the app, e.g. `AgregarDeudaModal`). Validation: if both are set, `fecha_hasta >= fecha_desde`.

### Editing
New `EditarViajeModal` component (mirrors `CrearViajeModal`'s structure: título, emoji, fechas — no participantes/imagen, those already have dedicated flows). Reached via a new "Editar viaje" option in `ViajeOpcionesSheet`, visible to `esCreador` only (matches existing options). Saves via `viajesService.editarViaje`, extended to accept `fechaDesde` / `fechaHasta` in `campos`.

`viajesService.crear` signature extended to accept `fechaDesde`/`fechaHasta` (nullable), passed through to the insert as `fecha_desde`/`fecha_hasta`. `mapViaje` exposes `fechaDesde`/`fechaHasta`.

## 2. Activities data model

New table `public.viaje_actividades`:

```sql
CREATE TABLE public.viaje_actividades (
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
```

- FK `created_by` → `public.profiles(id)` (same pattern as `viaje_checklist`/`viaje_notas`, needed for PostgREST join resolution).
- RLS: single `va_all` policy, participants-only — identical shape to `vg_all`/`vc_all`/`vn_all`:
  ```sql
  CREATE POLICY "va_all" ON public.viaje_actividades
    USING (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()))
    WITH CHECK (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));
  ```
- Index `idx_va_viaje_id ON public.viaje_actividades(viaje_id)` and `idx_va_fecha ON public.viaje_actividades(viaje_id, fecha)` (the daily cron query filters by date across all trips).
- Ordering: `ORDER BY fecha, hora NULLS LAST`. Activities with no `hora` are "todo el día" and render at the end of that day's list.
- No general/personal split — any participant can create, edit, or delete any activity in the trip, same permission model as gastos/checklist/notas today (delete is not restricted to the creator here, consistent with `vg_all`/`vc_all`/`vn_all` which don't restrict UPDATE/DELETE by `created_by` either — the checklist's personal/general split is the one exception in this codebase, and it does not apply here since this is shared-only).

### Service layer
`src/services/viajeActividadesService.js` (mirrors `viajeNotasService.js`):
- `getByViaje(viajeId)` → all activities, mapped and sorted.
- `crear(viajeId, { fecha, hora, titulo, ubicacion, nota })`
- `eliminar(id)`
- `editar(id, campos)`

### Hooks
- `src/hooks/queries/useViajeActividades.js` — TanStack Query, keyed by `viajeId`, included in `useViajeDetalle` fetch (same pattern as notas/gastos are pulled in there) OR fetched independently by the tab (follow whatever `useViajeNotas` does today — independent hook, fetched on tab mount).
- `src/hooks/mutations/useViajeActividadMutations.js` — crear/editar/eliminar with query invalidation.

## 3. Calendario tab UI

New tab `'📅 Calendario'` added to the `TABS` array in `ViajeDetailScreen.jsx`, rendering a new `ViajeCalendarioTab` component (`src/components/viajes/ViajeCalendarioTab.jsx`), following the visual language of `ViajeNotasTab`/`ViajeGastosTab`.

### Empty state (no fecha_desde/fecha_hasta)
Centered message + icon: "Este viaje no tiene fechas cargadas" with a button "Cargar fechas" that opens `EditarViajeModal` directly.

### Day strip
Horizontal `ScrollView` of day chips computed from `fecha_desde`..`fecha_hasta` (inclusive), one chip per calendar day: "Día 1 · 15 ago", "Día 2 · 16 ago", etc. Selected day highlighted (same active-pill style as the `segmented` tab control). Defaults to today if today falls within range, otherwise the first day.

### Agenda list
Below the strip: activities for the selected day, sorted by `hora` (nulls last), rendered as cards — hora badge (or "Todo el día"), título, ubicación (if set, with a pin icon), nota (if set, secondary text). Empty state per day: "Sin actividades para este día" with an inline "+ Agregar" affordance.

### Add/edit activity
Small modal (`AgregarActividadModal`), consistent with other trip modals: título (required text input), hora (optional, `DateTimePicker` in time mode), ubicación (optional text input), nota (optional multiline text input). Long-press or swipe on a card to delete (confirm via existing delete-confirmation pattern used elsewhere, e.g. `EliminarViajeModal`'s style, or a simple `Alert.alert` confirm — follow whatever `ViajeNotasTab` already does for deleting a note).

## 4. Daily summary notification

Trips can be closed while the app is backgrounded or uninstalled-and-reinstalled by other participants' devices, so this cannot be driven by the client — it needs a server-side scheduled job.

### Infrastructure (new to this project)
- Enable Postgres extensions `pg_cron` and `pg_net` (not currently used anywhere in the project; this migration turns them on for the first time).
- `cron.schedule('viaje-daily-summary', '0 11 * * *', $$ ... $$)` — 11:00 UTC = 08:00 America/Argentina/Buenos_Aires (Argentina has had a fixed UTC-3 offset with no DST since 2009, so no DST edge case to handle).
- The cron job calls the new edge function via `net.http_post`, authenticated with a shared secret (stored as a Postgres setting / Supabase secret, checked by the function — NOT the user JWT flow that `send-push-notification` uses, since there's no logged-in user in a cron context).

### New Edge Function `send-daily-viaje-summary`
- Rejects requests missing the correct shared-secret header.
- Computes "today" in `America/Argentina/Buenos_Aires`.
- Queries all `viajes` where `estado = 'activo'` and `today BETWEEN fecha_desde AND fecha_hasta`.
- For each such trip, queries `viaje_actividades` where `fecha = today`, ordered by `hora`.
- Skips trips with zero activities that day (no notification sent).
- For trips with activities, builds a summary body, e.g. `"3 actividades: 10:00 Museo, 14:00 Almuerzo, 20:00 Cena"` (truncate to first 3 + "y N más" if longer), title `"📅 {emoji} {titulo} — Hoy"`.
- Fetches all `viaje_participantes` for the trip, looks up each one's `fcm_token` from `profiles`, and sends via the same FCM v1 call pattern already implemented in `send-push-notification/index.ts` (reuse the `getAccessToken`/FCM payload logic — either factor it into a shared module or duplicate it, matching whatever's more consistent with how this project currently handles edge function code sharing, i.e. likely duplicate since each function is a standalone Deno file today).
- `data` payload: `{ type: 'viaje_resumen_dia', viajeId }` so tapping the notification can eventually deep-link to the Calendario tab (deep-link wiring itself is out of scope for this spec — only the payload shape is defined here).

## Error handling
- Date validation (hasta >= desde) surfaced as inline form error, same style as existing modals (`setError`).
- Activity `titulo` required, same validation style as `CrearViajeModal`'s `titulo` check.
- Cron/edge function failures are logged (`console.error`) per-trip so one trip's failure doesn't block others' notifications — loop with try/catch per trip, not a single all-or-nothing transaction.

## Testing
- Manual verification in the running app (per project convention — no existing automated test suite for these trip features): create a trip with dates, add activities across multiple days, verify day strip navigation, edit trip dates and confirm the strip recalculates, delete an activity.
- The cron path is verified by manually invoking the edge function with the shared secret against a trip whose `fecha_desde`/`fecha_hasta` includes today, confirming push delivery to a real device (same manual-verification approach already used for `send-push-notification`).
