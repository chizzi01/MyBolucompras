# Modo Viaje — Redirección Automática al Abrir la App — Design Spec

Date: 2026-07-23

## Summary

When the app is opened on or after a trip's start date (`fecha_desde`), and the user hasn't been asked about that specific trip yet, show a modal offering to activate "Modo Viaje" for it. While active, opening the app navigates directly to that trip's `ViajeDetailScreen` instead of landing on the default `Tabs` (Gastos). Can be turned off manually in Settings, and auto-deactivates the day after the trip's `fecha_hasta`.

## Scope

- New app-launch check (`ModoViajeChecker`) mirroring the existing `CierreChecker` pattern.
- New per-user persisted state on `configuracion_usuario`.
- New modal (`ModoViajeModal`) offering to activate Modo Viaje for a specific trip.
- New shared, module-level navigation ref so components outside the nested `AuthStack` can navigate into it.
- New Settings toggle in `ConfiguracionScreen`.

Out of scope: per-device Modo Viaje (this is an account-wide preference, consistent with how the rest of `configuracion_usuario` already works); letting the user manually pick which trip to activate from Settings (only the automatic prompt sets the trip); multi-trip simultaneous Modo Viaje; changing the trip's own detail screen.

## 1. Data — `configuracion_usuario`

Three new columns:
- `modo_viaje_activo boolean NOT NULL DEFAULT false`
- `modo_viaje_viaje_id uuid NULL REFERENCES public.viajes(id)`
- `modo_viaje_prompted_ids uuid[] NOT NULL DEFAULT '{}'`

`modo_viaje_prompted_ids` records every trip id the user has already been asked about (whether they accepted or declined), so the same trip never re-prompts.

`configuracionService.mapFromDB`/`mapToDB` gain:
- `modoViajeActivo: row.modo_viaje_activo ?? false` / `modo_viaje_activo: !!config.modoViajeActivo`
- `modoViajeViajeId: row.modo_viaje_viaje_id ?? null` / `modo_viaje_viaje_id: config.modoViajeViajeId ?? null`
- `modoViajePromptedIds: row.modo_viaje_prompted_ids ?? []` / `modo_viaje_prompted_ids: config.modoViajePromptedIds ?? []`

`getDefaults()` in `configuracionService.js` gains the same three fields with the same defaults, and `useConfiguracion.js`'s `defaultMydata` gains them too (matching the existing pattern where every config field has a placeholder default for pre-fetch renders).

No RLS changes needed — `configuracion_usuario` is already a per-`user_id`-scoped table with existing RLS.

## 2. `ModoViajeChecker`

New component at `src/components/ModoViajeChecker.jsx`, mounted in `App.js` next to the existing `<CierreChecker />` (same tree position: inside `DataProvider`, before `ViajesProvider`'s children, so it can call `useConfiguracion()` and `useViajes()` — both already work at that level since `CierreChecker` already calls `useConfiguracion()` from there).

Behavior, in a single `useEffect` keyed on `[mydata, viajesActivos]` (mirroring `CierreChecker`'s effect-per-data-change style), guarded by a `useRef` flag so the auto-navigate step only fires once per app session (component lifetime):

1. **Auto-deactivate.** If `mydata.modoViajeActivo` is true: find the trip `mydata.modoViajeViajeId` in `viajesActivos` (or fetch via the already-loaded `viajes` list — `viajesActivos` filters to `estado === 'activo'`, which is what we want since a closed trip should also stop Modo Viaje). If that trip is missing, or has a `fechaHasta` and today's date (local) is more than 1 calendar day after `fechaHasta` (i.e. `today > fechaHasta + 1 day`), call `actualizar.mutateAsync({ ...mydata, modoViajeActivo: false, modoViajeViajeId: null })`. No modal, no navigation — this only ever turns things off.
2. **Prompt.** Else, if `mydata.modoViajeActivo` is false: filter `viajesActivos` to those where `fechaDesde` and `fechaHasta` are both set, `fechaDesde <= today <= fechaHasta` (using `toISODate`/`parseISODate` from `src/utils/formatters.js` for local-date-safe comparison — the same helpers already used by the Calendario feature), and `!mydata.modoViajePromptedIds.includes(viaje.id)`. If more than one matches, pick the one with the latest `fechaDesde`. If exactly one candidate exists, set it as local state and render `ModoViajeModal` with `visible=true`.
3. **Redirect.** Else, if `mydata.modoViajeActivo` is true and `mydata.modoViajeViajeId` is set (and step 1 didn't just turn it off): on the first run only (guarded by the `useRef` flag), call the shared `navigate('ViajeDetail', { viajeId: mydata.modoViajeViajeId })` helper (see §3).

## 3. Shared navigation ref

`ViajeDetailScreen` is registered inside the nested `AuthStack.Navigator` in `App.js`. `ModoViajeChecker` (like `CierreChecker`) is rendered as a sibling before that navigator, not inside it, so a local `useNavigation()` call would resolve to the outer `Stack.Navigator` (which only knows about `Login`/`Lock`/`Onboarding`/`Main`) and couldn't reach `ViajeDetail`.

New file `src/navigation/navigationRef.js`:

```js
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
```

`App.js` changes: `AppWithTheme` currently does `const navigationRef = useNavigationContainerRef();` and passes it to `<NavigationContainer ref={navigationRef}>`, then uses that same local `navigationRef` in its notification-response `useEffect`. This is replaced by importing the shared `navigationRef` from the new module instead of creating a local one — `<NavigationContainer ref={navigationRef}>` now receives the shared ref, and the existing notification-tap code keeps working unchanged (same object, just sourced from the shared module instead of the local hook). `ModoViajeChecker` imports `navigate` from the same module to perform its redirect.

## 4. `ModoViajeModal`

New file `src/components/ModoViajeModal.jsx`, visually following `ActualizarCierreModal`'s card-modal pattern (icon circle, title, message, primary action, `backdrop`/`card` style shapes) but with a `Switch` instead of a date picker:

- Props: `{ visible, viaje, onClose }` — `viaje` is the candidate trip object (`{ id, titulo, emoji }` at minimum) computed by `ModoViajeChecker`.
- Icon: a suitcase/airplane `Ionicons` glyph (e.g. `airplane-outline`) in the same `iconCircle` style.
- Title: `"¿Activar Modo Viaje?"`.
- Message: `"{viaje.emoji} {viaje.titulo} ya empezó. Con Modo Viaje activado, la app te va a llevar directo a este viaje al abrirla."`.
- A row with label `"Activar Modo Viaje"` and a `Switch` (local `useState`, defaults to `false`).
- A single full-width `"Confirmar"` button (no separate "Ahora no" — the switch already encodes the choice; leaving it off and confirming is equivalent to declining).
- On confirm: always append `viaje.id` to `mydata.modoViajePromptedIds` (dedup via `[...new Set([...ids, viaje.id])]`). If the switch is on, additionally set `modoViajeActivo: true, modoViajeViajeId: viaje.id` in the same `actualizar.mutateAsync({ ...mydata, ... })` call, then call the shared `navigate('ViajeDetail', { viajeId: viaje.id })`. Either way, call `onClose()` after the mutation settles (matching `ActualizarCierreModal`'s `finally`-based loading/close pattern).
- `onRequestClose` (Android back button) behaves the same as confirming with the switch off — it still records the trip in `modoViajePromptedIds` so it won't re-prompt. This means `onRequestClose` triggers the same "confirm with switch off" logic path, not a no-op dismiss.

## 5. Settings toggle

In `ConfiguracionScreen.jsx`, inside the existing "Seguridad" `AccordionSection` (or a new section directly above/below it — implementer's choice, following whatever reads better alongside the biometric row), add a row matching the biometric row's exact structure (`bioRow`/`bioInfo`/`bioTitle`/`bioSub` + `Switch` styles, reused as-is):

- Icon: `airplane-outline` (matching the modal's icon), colored `colors.primary` when `mydata.modoViajeActivo` else the muted gray already used for the disabled biometric icon color.
- Title: `"Modo Viaje"`.
- Subtitle: if `modoViajeActivo` and the trip is found in `viajesActivos`, show `"Activo: {emoji} {titulo}"`; else if there's no trip in `viajesActivos` whose date range includes today, show `"No hay ningún viaje en curso"` and disable the switch; else (a trip is in range but Modo Viaje isn't on) show `"Se activa desde el aviso al abrir la app"`.
- `Switch` value = `mydata.modoViajeActivo`. The switch is only ever interactive to turn **off** an already-active Modo Viaje from here (per the approved design — no manual re-activation from Settings, only via the modal): set `disabled={!mydata.modoViajeActivo}` unconditionally (regardless of whether a trip is currently in range), so it's only tappable while `modoViajeActivo` is true. `onValueChange` (only reachable while enabled, i.e. while turning off) calls `actualizar.mutateAsync({ ...mydata, modoViajeActivo: false, modoViajeViajeId: null })` — `modoViajePromptedIds` is left untouched, so the trip won't re-prompt even after being turned off manually.

## Error handling

- If the `actualizar` mutation fails inside `ModoViajeModal`, follow `ActualizarCierreModal`'s existing pattern: swallow the error (the mutation's own `onError` already rolls back the optimistic cache write) and still call `onClose()` — don't leave the user stuck on a modal that can't be dismissed.
- If `navigate('ViajeDetail', ...)` is called before the navigator is ready, `navigationRef.isReady()` guards it — the redirect simply doesn't happen that pass; since `ModoViajeChecker`'s effect re-runs on `mydata`/`viajesActivos` changes (e.g. after the query settles post-login), and the ref becomes ready very early in the app lifecycle, this is a non-issue in practice but the guard prevents a crash.
- If a trip referenced by `modo_viaje_viaje_id` was deleted, step 1 (auto-deactivate) already handles it — "trip missing from `viajesActivos`" is treated the same as "past its end date."

## Testing

No automated test suite exists in this project (established convention). Manual verification: create a trip with `fecha_desde` = today, confirm the modal appears on next app launch with the correct trip name; toggle the switch on and confirm, verify the app navigates to that trip and that reopening the app lands there directly; verify the same trip never re-prompts; toggle off from Settings and confirm the app goes back to landing on Gastos; create a trip whose `fecha_hasta` was 2+ days ago while Modo Viaje is active for it, reopen the app, confirm it silently turns off with no modal and lands on Gastos.
