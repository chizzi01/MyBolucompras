# Viajes Module — Design Spec
Date: 2026-06-04

## Overview

Port the Viajes (trips) module from the React Native mobile app to the React/Electron desktop app. Viajes lets users create group trips, track shared expenses, calculate who owes whom, register payments, and keep a shared checklist/notes tab. The desktop version uses two separate pages (list + detail), a modal-based expense form, and Supabase Realtime for the notes tab.

## Architecture

### New files

| File | Purpose |
|------|---------|
| `src/services/viajesService.js` | CRUD for trips + participants + close/reopen. No push notifications (desktop). |
| `src/services/viajeGastosService.js` | CRUD for trip expenses + `calcularBalance` (pure function). |
| `src/services/viajePagosService.js` | Register payments between participants. |
| `src/services/viajeNotasService.js` | Checklist + notas CRUD + Supabase Realtime subscription. |
| `src/context/ViajesContext.jsx` | Global state for the trips list. Exposes `viajes`, `loading`, `crear`, `cerrar`, `reabrir`, `eliminar`, `editarViaje`. |
| `src/pages/ViajesPage.jsx` | Trip list page (`/viajes`). |
| `src/pages/ViajeDetallePage.jsx` | Trip detail page (`/viajes/:id`) with 3 tabs. |
| `src/components/viajes/CrearViajeModal.jsx` | Create trip: título, emoji picker, participant search. |
| `src/components/viajes/ViajeGastoModal.jsx` | Add expense within a trip: objeto, precio, fecha, pagador, split mode. |
| `src/components/viajes/RegistrarPagoModal.jsx` | Register a payment between two participants. |
| `src/styles/viajes.css` | All viajes styles using CSS variables. |

### Modified files

| File | Change |
|------|--------|
| `src/App.jsx` | Add routes `/viajes` and `/viajes/:id` with lazy load + ViajesProvider. |
| `src/components/Navbar.jsx` | Add "Viajes" nav link with `IoAirplane` icon between Deudores and Ayuda. |

## Database (existing tables — shared with mobile)

| Table | Key columns |
|-------|-------------|
| `viajes` | `id, titulo, emoji, estado ('activo'|'cerrado'), imagen_url, created_by, fecha_cierre, created_at` |
| `viaje_participantes` | `viaje_id, user_id, joined_at` — join to `profiles(id, nombre, email)` |
| `viaje_gastos` | `id, viaje_id, objeto, precio (total paid), fecha, etiqueta, pagado_por, modo_split ('solo'|'todos'|'algunos'), participantes (uuid[]), created_at` |
| `viaje_pagos` | `id, viaje_id, pagador_id, receptor_id, monto, fecha` |
| `viaje_checklist` | `id, viaje_id, texto, completados_por (uuid[]), created_by` — join to `profiles` |
| `viaje_notas` | `id, viaje_id, texto, created_by, created_at` — join to `profiles` |

## Services

### `viajesService`
- `getAll()` — fetches trips where user is a participant (via `viaje_participantes` join). Uses `getUser()`.
- `getById(id)` — single trip with participants.
- `crear(titulo, emoji, participanteIds)` — inserts trip, adds all participants (always includes creator). No push notifications.
- `cerrar(id)` — validates `liquidacion.length === 0`, deletes `gastos` with `viaje_id`, inserts summary expense per participant, sets `estado='cerrado'`.
- `reabrir(id)` — deletes summary gastos with `viaje_id`, sets `estado='activo'`.
- `eliminar(id)` — hard delete.
- `editarViaje(id, { titulo, emoji })` — partial update.
- `agregarParticipante(viajeId, userId)` / `quitarParticipante(viajeId, userId)`.

### `viajeGastosService`
- `getByViaje(viajeId)` — all expenses for a trip, ordered by `created_at desc`.
- `agregarGasto(viajeId, gastoData, splitConfig, viajeParticipantes)` — inserts to `viaje_gastos`. `splitConfig = { modoSplit, participanteIds }`.
- `eliminarGasto(gastoId)`.
- `calcularBalance(viajeGastos, participantes, pagos)` — pure function. Returns `{ porPersona: [{userId, nombre, total, neto}], liquidacion: [{de, deNombre, hacia, haciaNombre, monto}] }`. Uses greedy creditor/debtor matching to minimize transactions.

### `viajePagosService`
- `getByViaje(viajeId)`.
- `registrar(viajeId, pagadorId, receptorId, monto)`.

### `viajeNotasService`
- `getChecklist(viajeId)` / `getNotas(viajeId)`.
- `agregarItem(viajeId, texto, userId)` / `toggleItem(itemId, userId, marcar)` / `eliminarItem(itemId)`.
- `agregarNota(viajeId, texto, userId)` / `eliminarNota(notaId)`.
- `subscribeChecklist(viajeId, callback)` — Supabase Realtime channel on `viaje_checklist`. Returns channel for cleanup.

## Context: `ViajesContext`

```
state: { viajes: [], loading: false, error: null }
actions: crear, cerrar, reabrir, eliminar, editarViaje, recargar
```

- Loads on mount when user is authenticated.
- Mutations use optimistic updates with snapshot rollback on error.
- `cerrar` throws with user-facing message if liquidación has pending balances.

## Pages

### `ViajesPage` (`/viajes`)

- Toolbar: title "Mis Viajes ✈️", button "Nuevo viaje".
- Section "Activos": trip cards for `estado === 'activo'`.
- Section "Archivados": trip cards for `estado === 'cerrado'` (collapsed by default if > 0).
- Each card: emoji + título, avatar stack (max 4 + "+N"), total gastado badge, click → navigate to `/viajes/:id`.
- Empty state if no trips.

### `ViajeDetallePage` (`/viajes/:id`)

Loads trip data (viaje + gastos + pagos) on mount. Refetches on focus.

**Header**: back button "← Mis Viajes", emoji + título, avatar stack, total gastado, options menu (⋯).

**Options menu** (dropdown):
- Editar (abre CrearViajeModal en modo edición)
- Cerrar viaje (si activo) → confirms → calls `viajesService.cerrar`
- Reabrir viaje (si cerrado) → calls `viajesService.reabrir`
- Eliminar → confirm → `viajesService.eliminar` + navigate back

**"Solo lectura" banner** when `estado === 'cerrado'`.

**3 tabs: 💸 Gastos / ⚖️ Balance / ✅ Notas**

#### Tab Gastos
- List grouped by date (Hoy / Ayer / "2 jun").
- Each row: colored avatar (pagador initial), objeto, pagador name + split text ("÷ 3 personas" or "solo él/ella"), total amount, per-person amount if split > 1.
- Delete button (trash icon) per row — only visible if `estado === 'activo'`. Confirm before delete.
- FAB "Agregar gasto" — only if activo — opens `ViajeGastoModal`.
- Empty state "Sin gastos todavía 💸".

#### Tab Balance
- **"Cuánto puso cada uno"** section: card per participant with avatar, name, total paid, net amount (+/-), proportional bar.
- **"Transferencias pendientes"** section: each pending transfer shows payer → receiver with amount and "Registrar pago" button (only if activo).
- **"Todo saldado ✅"** — shown when liquidacion is empty.
- **"Pagos registrados"** section: list of recorded payments.

#### Tab Notas
- **"Qué llevar"** checklist: each item shows checkbox state per participant. Current user can toggle their own state. Creator can delete their items. Add item input (only if activo).
- **"Notas del grupo"**: free text notes with author + date. Creator can delete. Add note textarea (only if activo).
- Realtime: Supabase channel subscription refreshes checklist on remote changes.

## Components

### `CrearViajeModal`
Fields:
- Título (text input, required)
- Emoji (grid of ~20 travel emojis, click to select, default ✈️)
- Participantes: search input → `userService.buscarPorEmail` → show result chip → add to list. Same pattern as `DeudaModal`. Creator always included (shown as non-removable).

### `ViajeGastoModal`
Fields:
- Objeto (text, required)
- Precio (number, required)
- Fecha (date picker, default today)
- Quién pagó: dropdown/selector of trip participants (default: current user)
- Modo split: 3 toggle buttons — Todos / Algunos / Solo yo
- Si "Algunos": checkbox list of participants (excluding pagador)
- Etiqueta (optional text)

### `RegistrarPagoModal`
Pre-filled from the liquidación row (pagador, receptor, monto suggested). User can adjust amount. Calls `viajePagosService.registrar`.

## Routing

```jsx
<Route path="/viajes" element={<ProtectedRoute><ViajesProvider><ViajesPage /></ViajesProvider></ProtectedRoute>} />
<Route path="/viajes/:id" element={<ProtectedRoute><ViajeDetallePage /></ViajeDetallePage></ProtectedRoute>} />
```

Note: `ViajeDetallePage` loads its own data independently (no context needed for detail — it fetches directly by id).

## Error handling

- `cerrar` with pending balances: catch the thrown error, show it via `addToast` with the participant names.
- All mutations: try/catch + toast on error. Optimistic rollback in context mutations.
- `getAll()` no results: show empty state, not error.

## Styles (`viajes.css`)

Follows the same CSS variable system as `deudores.css`. Key classes:
- `.viajes-container`, `.viajes-toolbar`, `.viajes-section-title`
- `.viaje-card` — trip card with hover shadow
- `.viaje-card-avatar-stack` — overlapping participant avatars
- `.viaje-detalle-header`, `.viaje-tabs`, `.viaje-tab-btn`
- `.viaje-gasto-row`, `.viaje-gasto-sep` (date separator)
- `.viaje-balance-card`, `.viaje-balance-bar`
- `.viaje-transfer-card`, `.viaje-pago-row`
- `.viaje-checklist-item`, `.viaje-nota-card`
- `.viaje-fab` — floating action button
