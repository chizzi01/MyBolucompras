# Desktop Mobile-Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port five mobile-only features to the desktop Electron app: the debt/expense date-filter fix, viaje date ranges + editing, the viaje checklist General/Personal split, Modo Viaje auto-redirect, and the viaje Calendario tab.

**Architecture:** Desktop uses plain React Context (`DataContext`, `DeudoresContext`, `ViajesContext`) with `useState`/`useEffect` and manual optimistic updates — no React Query. All new code follows that pattern. The shared Supabase project (`hmlcgwptszhqknyrmarf`) already has every column/table this plan needs (`viajes.fecha_desde/fecha_hasta`, `viaje_actividades`, `viaje_checklist.tipo` + RLS, `configuracion_usuario.modo_viaje_*`) — no migrations in this plan.

**Tech Stack:** React 18, react-router-dom (`HashRouter`), Supabase JS client, plain CSS (no component library for these views).

## Global Constraints

- No test framework exists in this repo (no `vitest`/`jest`, no test script in `package.json`). Every task's verification step is a manual check in the running app: `npm run dev` starts the Vite web build (`http://localhost:5173` by default); `npm run electron:dev` runs it inside the Electron shell. Either is fine for manual verification.
- Reuse existing CSS classes (`modal-overlay`, `modal-card`, `form-field`, `form-input`, `viaje-seg-tabs`, `viaje-seg-btn`, `switch-track`/`switch-thumb`, etc.) — do not invent a parallel design system.
- All dates that come from Supabase `date` columns are ISO `YYYY-MM-DD` strings. All dates in the `deudores`/`gastos` domain objects (`fechaDeuda`, `fecha`) are `DD/MM/YYYY` strings, converted at the service boundary — follow the existing `mapToDB`/`mapFromDB` conversion pattern in `deudoresService.js`.
- Every task ends with a commit.

---

## Task 1: Fix reciprocal date filter in `deudoresService.marcarPagada`

**Files:**
- Modify: `mybolucompras/src/services/deudoresService.js:108-145` (the `marcarPagada` method)

**Interfaces:**
- Consumes: nothing new.
- Produces: `deudoresService.marcarPagada(id, deudaActual)` behaves identically from the caller's point of view (same signature, same return type `void`), just filters more precisely internally.

**Problem:** the three reciprocal `.update(...)` queries inside `marcarPagada` filter only by `.eq('monto', monto)` (and `.eq('precio', monto)` for `gastos`). If the same two users share two debts of the same amount, marking one paid can mark the wrong row. Mobile fixed this in commit `28e8c31` by also filtering on the debt's date.

- [ ] **Step 1: Read the current method to confirm line numbers**

Read `mybolucompras/src/services/deudoresService.js` lines 108-150 and confirm the three reciprocal queries (`deudores` update, first `gastos` update, second `gastos` update) match what's described above. If the file has drifted, adjust the line numbers used in Step 2 accordingly — the logic below is what matters, not the exact line numbers.

- [ ] **Step 2: Add the date filter**

Replace the body of `marcarPagada` with:

```javascript
  async marcarPagada(id, deudaActual) {
    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('deudores')
      .update({ pagado: true, fecha_pago: today })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;

    if (deudaActual.compartidoConUserId && user) {
      const otroUserId = deudaActual.compartidoConUserId;
      const monto = deudaActual.monto;
      let fechaDeudaISO = deudaActual.fechaDeuda;
      if (fechaDeudaISO?.includes('/')) fechaDeudaISO = fechaDeudaISO.split('/').reverse().join('-');

      const results = await Promise.all([
        // Deuda del otro usuario — sin filtro pagado=false para que el re-marcado mensual funcione.
        // fecha_deuda acota a la deuda correspondiente cuando hay varias con el mismo monto.
        supabase
          .from('deudores')
          .update({ pagado: true, fecha_pago: today })
          .eq('user_id', otroUserId)
          .eq('compartido_con_user_id', user.id)
          .eq('monto', monto)
          .eq('fecha_deuda', fechaDeudaISO),
        // Gasto del otro usuario
        supabase
          .from('gastos')
          .update({ pagado: true, fecha_pago: today })
          .eq('user_id', otroUserId)
          .eq('compartido_con_user_id', user.id)
          .eq('precio', monto)
          .eq('fecha', fechaDeudaISO),
        // Mi gasto si existe
        supabase
          .from('gastos')
          .update({ pagado: true, fecha_pago: today })
          .eq('user_id', user.id)
          .eq('compartido_con_user_id', otroUserId)
          .eq('precio', monto)
          .eq('fecha', fechaDeudaISO),
      ]);
      results.forEach(({ error: e }) => { if (e) throw e; });
    }
  },
```

Keep whatever code came after the original reciprocal-update block (if any, e.g. a notification insert) — this replacement is only for the block shown in the current file; if `marcarPagada` has more statements after the `Promise.all`, leave them in place unchanged.

- [ ] **Step 3: Manual verification**

Run the app (check `package.json` scripts — likely `npm run dev` for the Vite web build or `npm run electron:dev` for the Electron shell). Log in with a test account that has two shared debts with the same person and the same amount but different dates (create them via the "Nueva deuda" flow in `/deudores` if you don't have two already sharing amount). Mark one as paid, then reload `/deudores` and confirm only the intended debt (matching both amount and date) shows `pagado`, and the other debt with the same amount is untouched.

- [ ] **Step 4: Commit**

```bash
git add mybolucompras/src/services/deudoresService.js
git commit -m "fix(deudores): filter reciprocal marcarPagada updates by fecha_deuda"
```

---

## Task 2: Gate "marcar pagada" with `gastoEntraEsteMes` in `DeudoresPage`

**Files:**
- Modify: `mybolucompras/src/context/DeudoresContext.jsx:55-68` (`marcarPagada`)
- Modify: `mybolucompras/src/pages/DeudoresPage.jsx` (import `useData`, gate button rendering and "marcar todas" if present)

**Interfaces:**
- Consumes: `gastoEntraEsteMes(gastoLike, mydata)` from `mybolucompras/src/utils/cuotas.js` (already exists, signature `(gasto: {isFijo, tipo, fecha}, mydata: {cierre, cierreAnterior}) => boolean`); `useData()` from `mybolucompras/src/context/DataContext.jsx` (already exists, returns `{ mydata, ... }`).
- Produces: `DeudoresContext.marcarPagada(id, deudaActual, mydata)` — note the **new third parameter**; throws `Error('No se puede marcar como pagada una deuda que todavía no entra este mes')` when the deuda's installment hasn't hit this month's bill yet.

**Problem:** desktop has no equivalent of mobile's guard that prevents marking a future credit installment as paid before it's actually billed.

- [ ] **Step 1: Add a `deudaEntraEsteMes` adapter and guard in `DeudoresContext.marcarPagada`**

In `mybolucompras/src/context/DeudoresContext.jsx`, add near the top (after imports):

```javascript
import { gastoEntraEsteMes } from '../utils/cuotas';

const deudaEntraEsteMes = (deuda, mydata) =>
  gastoEntraEsteMes({ ...deuda, fecha: deuda.fechaDeuda }, mydata);
```

Change the `marcarPagada` function signature and add the guard as the first line of the body:

```javascript
  const marcarPagada = async (id, deudaActual, mydata) => {
    if (!deudaEntraEsteMes(deudaActual, mydata)) {
      throw new Error('No se puede marcar como pagada una deuda que todavía no entra este mes');
    }
    const snapshot = deudas;
    const fechaPago = new Date().toISOString().split('T')[0].split('-').reverse().join('/');
    setDeudas(prev => prev.map(d =>
      d.id === id ? { ...d, pagado: true, fechaPago } : d
    ));
    try {
      await deudoresService.marcarPagada(id, deudaActual);
    } catch (err) {
      setDeudas(snapshot);
      setError(err.message);
      throw err;
    }
  };
```

- [ ] **Step 2: Wire `mydata` through in `DeudoresPage.jsx`**

Add the import and pull `mydata` from `useData()`:

```javascript
import { useData } from '../context/DataContext';
```

```javascript
  const { mydata } = useData();
  const { deudas, loading, agregarDeuda, editarDeuda, marcarPagada, eliminarDeuda } = useDeudores();
```

Update `handleMarcarPagada`:

```javascript
  const handleMarcarPagada = async (deuda) => {
    try {
      await marcarPagada(deuda.id, deuda, mydata);
      addToast('Deuda marcada como pagada', 'success');
    } catch (e) {
      addToast(e.message || 'Error al marcar como pagada', 'error');
    }
  };
```

Add a helper near the top of the component (or module scope, mirroring the context's adapter):

```javascript
import { gastoEntraEsteMes } from '../utils/cuotas';

const deudaEntraEsteMes = (deuda, mydata) =>
  gastoEntraEsteMes({ ...deuda, fecha: deuda.fechaDeuda }, mydata);
```

In the row-rendering block, change the pagado/no-pagado branch so the "marcar como pagada" button only renders when `deudaEntraEsteMes(deuda, mydata)` is true:

```jsx
                          {deuda.pagado ? (
                            <span className="deuda-badge-pagado">✓ Pagado</span>
                          ) : deudaEntraEsteMes(deuda, mydata) ? (
                            <div className="deuda-fila-acciones">
                              <button className="deuda-btn-icon success" title="Marcar como pagada" onClick={() => handleMarcarPagada(deuda)}>
                                <IoCheckmarkCircleOutline size={17} />
                              </button>
                              <button className="deuda-btn-icon" title="Editar" onClick={() => handleEdit(deuda)}>
                                <IoPencilOutline size={16} />
                              </button>
                              <button className="deuda-btn-icon danger" title="Eliminar" onClick={() => handleEliminar(deuda.id)}>
                                <IoTrashOutline size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="deuda-fila-acciones">
                              <span className="deuda-badge-pendiente" title="Todavía no entra en la facturación de este mes">⏳ Próximo mes</span>
                              <button className="deuda-btn-icon" title="Editar" onClick={() => handleEdit(deuda)}>
                                <IoPencilOutline size={16} />
                              </button>
                              <button className="deuda-btn-icon danger" title="Eliminar" onClick={() => handleEliminar(deuda.id)}>
                                <IoTrashOutline size={16} />
                              </button>
                            </div>
                          )}
```

Add a small CSS rule for the new badge in `mybolucompras/src/styles/deudores.css` (append at the end of the file):

```css
.deuda-badge-pendiente {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
}
```

- [ ] **Step 3: Manual verification**

Run the app. Create a credit-installment debt (`tipo: 'credito'`, `cuotas > 1`) dated after the current `cierre` configured in `/configuracion` (or set a `cierre` in the past so an existing debt qualifies). Confirm the row shows "⏳ Próximo mes" instead of the mark-paid button, and that editing/deleting still works. Then set the debt's date inside the current billing window and confirm the mark-paid button reappears and works.

- [ ] **Step 4: Commit**

```bash
git add mybolucompras/src/context/DeudoresContext.jsx mybolucompras/src/pages/DeudoresPage.jsx mybolucompras/src/styles/deudores.css
git commit -m "feat(deudores): gate marcar pagada with gastoEntraEsteMes"
```

---

## Task 3: Add `formatRangoFechas` to `formatters.js`

**Files:**
- Modify: `mybolucompras/src/utils/formatters.js` (add new export)

**Interfaces:**
- Produces: `formatRangoFechas(fechaDesde: string|null, fechaHasta: string|null) => string|null` — both args are ISO `YYYY-MM-DD` or nullish. Returns `null` if either is missing, else `"DD mmm - DD mmm"` (adds year if either date isn't in the current year).

- [ ] **Step 1: Add the function**

Append to `mybolucompras/src/utils/formatters.js`:

```javascript
export function formatRangoFechas(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) return null;
  const start = new Date(`${fechaDesde}T00:00:00`);
  const end = new Date(`${fechaHasta}T00:00:00`);
  if (isNaN(start) || isNaN(end)) return null;
  const currentYear = new Date().getFullYear();
  const crossesYear = start.getFullYear() !== currentYear || end.getFullYear() !== currentYear;
  const opts = crossesYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' };
  const startLabel = start.toLocaleDateString('es-AR', opts);
  const endLabel = end.toLocaleDateString('es-AR', opts);
  return `${startLabel} - ${endLabel}`;
}
```

- [ ] **Step 2: Manual verification**

Open the Electron devtools console (or a scratch `node -e` script using this exact function body copy-pasted, since there's no test runner) and check: `formatRangoFechas('2026-08-01', '2026-08-10')` → `"01 ago - 10 ago"`; `formatRangoFechas(null, '2026-08-10')` → `null`; a range spanning into next year shows the year suffix.

- [ ] **Step 3: Commit**

```bash
git add mybolucompras/src/utils/formatters.js
git commit -m "feat(viajes): add formatRangoFechas helper"
```

---

## Task 4: Thread `fechaDesde`/`fechaHasta` through `viajesService` and `ViajesContext`

**Files:**
- Modify: `mybolucompras/src/services/viajesService.js` (`crear`, `editarViaje`, `mapViaje`)
- Modify: `mybolucompras/src/context/ViajesContext.jsx` (`crear`, `editarViaje`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `viajesService.crear(titulo, emoji, participanteIds, fechaDesde = null, fechaHasta = null)`; `viajesService.editarViaje(id, campos)` now also accepts `campos.fechaDesde`/`campos.fechaHasta`; `mapViaje(row)` output now includes `fechaDesde`/`fechaHasta` (ISO strings or `null`); `ViajesContext.crear(titulo, emoji, participanteIds, fechaDesde, fechaHasta)`; `ViajesContext.editarViaje(id, campos)` unchanged signature (already forwards `campos` opaquely).

- [ ] **Step 1: Update `viajesService.js`**

Change `crear`:

```javascript
  async crear(titulo, emoji, participanteIds, fechaDesde = null, fechaHasta = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: viaje, error } = await supabase
      .from('viajes')
      .insert([{ titulo, emoji, created_by: user.id, fecha_desde: fechaDesde, fecha_hasta: fechaHasta }])
      .select()
      .single();
    if (error) throw error;

    const ids = [...new Set([user.id, ...participanteIds])];
    const rows = ids.map(uid => ({ viaje_id: viaje.id, user_id: uid }));
    const { error: partError } = await supabase.from('viaje_participantes').insert(rows);
    if (partError) throw partError;

    return viajesService.getById(viaje.id);
  },
```

Change `editarViaje`:

```javascript
  async editarViaje(id, campos) {
    const update = {};
    if (campos.titulo !== undefined) update.titulo = campos.titulo;
    if (campos.emoji !== undefined) update.emoji = campos.emoji;
    if ('imagenUrl' in campos) update.imagen_url = campos.imagenUrl;
    if ('fechaDesde' in campos) update.fecha_desde = campos.fechaDesde;
    if ('fechaHasta' in campos) update.fecha_hasta = campos.fechaHasta;
    const { error } = await supabase.from('viajes').update(update).eq('id', id);
    if (error) throw error;
  },
```

Change `mapViaje` to add the two fields:

```javascript
function mapViaje(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    emoji: row.emoji || '✈️',
    imagenUrl: row.imagen_url || null,
    estado: row.estado,
    createdBy: row.created_by,
    fechaCierre: row.fecha_cierre,
    fechaDesde: row.fecha_desde || null,
    fechaHasta: row.fecha_hasta || null,
    createdAt: row.created_at,
    participantes: (row.viaje_participantes || [])
      .sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at))
      .map(p => ({
        userId: p.user_id,
        nombre: p.profiles?.nombre || p.profiles?.email || p.user_id,
        email: p.profiles?.email || '',
      })),
  };
}
```

- [ ] **Step 2: Update `ViajesContext.jsx`**

Change `crear`:

```javascript
  const crear = async (titulo, emoji, participanteIds, fechaDesde, fechaHasta) => {
    const snapshot = [...viajes];
    try {
      const nuevo = await viajesService.crear(titulo, emoji, participanteIds, fechaDesde, fechaHasta);
      setViajes(prev => [nuevo, ...prev]);
      return nuevo;
    } catch (e) {
      setViajes(snapshot);
      throw e;
    }
  };
```

`editarViaje` already forwards `campos` opaquely to `viajesService.editarViaje(id, campos)` — no change needed there.

- [ ] **Step 3: Manual verification**

Run the app, open the devtools Network/console, and confirm no errors are thrown when navigating to `/viajes` and `/viajes/:id` (the new fields are optional so existing flows must keep working unchanged — this task adds plumbing only, no UI yet).

- [ ] **Step 4: Commit**

```bash
git add mybolucompras/src/services/viajesService.js mybolucompras/src/context/ViajesContext.jsx
git commit -m "feat(viajes): thread fecha_desde/fecha_hasta through service and context"
```

---

## Task 5: Add date range fields to `CrearViajeModal` (create + edit)

**Files:**
- Modify: `mybolucompras/src/components/viajes/CrearViajeModal.jsx`
- Modify: `mybolucompras/src/pages/ViajesPage.jsx` (`handleCrear`)
- Modify: `mybolucompras/src/pages/ViajeDetallePage.jsx` (`handleEditSave`)

**Interfaces:**
- Consumes: `viajesService.crear`/`editarViaje` from Task 4, `ViajesContext.crear` from Task 4.
- Produces: `CrearViajeModal`'s `onSave` callback is now called as `onSave(titulo, emoji, participanteIds, fechaDesde, fechaHasta)` — both new args are `''` or an ISO date string; callers must accept the new arity even where they don't use it.

- [ ] **Step 1: Add date state and fields to `CrearViajeModal.jsx`**

Add state near the top of the component:

```javascript
  const [fechaDesde, setFechaDesde] = useState(viaje?.fechaDesde || '');
  const [fechaHasta, setFechaHasta] = useState(viaje?.fechaHasta || '');
```

Add validation in `handleGuardar` (before the `try`):

```javascript
    if (fechaDesde && fechaHasta && fechaHasta < fechaDesde) {
      setError('La fecha de fin no puede ser anterior a la de inicio');
      return;
    }
```

Change the `onSave` call:

```javascript
      await onSave(titulo.trim(), emoji, participantes.map(p => p.userId), fechaDesde || null, fechaHasta || null);
```

Add the date fields to the JSX, right after the emoji `form-field` block and before the participantes block:

```jsx
          {/* Fechas */}
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Desde</label>
              <input
                className="form-input"
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Hasta</label>
              <input
                className="form-input"
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                min={fechaDesde || undefined}
              />
            </div>
          </div>
```

- [ ] **Step 2: Update `ViajesPage.jsx`'s `handleCrear`**

```javascript
  const handleCrear = async (titulo, emoji, participanteIds, fechaDesde, fechaHasta) => {
    try {
      const nuevo = await crear(titulo, emoji, participanteIds, fechaDesde, fechaHasta);
      setModalOpen(false);
      addToast('Viaje creado', 'success');
      navigate(`/viajes/${nuevo.id}`);
    } catch {
      addToast('Error al crear el viaje', 'error');
      throw new Error('create failed');
    }
  };
```

- [ ] **Step 3: Update `ViajeDetallePage.jsx`'s `handleEditSave`**

```javascript
  const handleEditSave = async (titulo, emoji, _participanteIds, fechaDesde, fechaHasta) => {
    try {
      await viajesService.editarViaje(id, { titulo, emoji, fechaDesde, fechaHasta });
      setEditModal(false);
      addToast('Viaje actualizado', 'success');
      cargar();
    } catch {
      addToast('Error al actualizar', 'error');
      throw new Error('edit failed');
    }
  };
```

- [ ] **Step 4: Manual verification**

Run the app. Create a new viaje with a date range set, confirm it saves without error (check the Supabase `viajes` table row has `fecha_desde`/`fecha_hasta` populated, or just reload `/viajes/:id` and re-open "Editar" to confirm the fields are pre-filled with the values you set). Edit an existing viaje's dates and confirm they persist across reload. Try setting `hasta` before `desde` and confirm the inline validation error appears and blocks saving.

- [ ] **Step 5: Commit**

```bash
git add mybolucompras/src/components/viajes/CrearViajeModal.jsx mybolucompras/src/pages/ViajesPage.jsx mybolucompras/src/pages/ViajeDetallePage.jsx
git commit -m "feat(viajes): add date range fields to crear/editar viaje modal"
```

---

## Task 6: Display date range on `ViajeCard` and `ViajeDetallePage` header

**Files:**
- Modify: `mybolucompras/src/pages/ViajesPage.jsx` (`ViajeCard` component)
- Modify: `mybolucompras/src/pages/ViajeDetallePage.jsx` (hero header)
- Modify: `mybolucompras/src/styles/viajes.css` (append new classes)

**Interfaces:**
- Consumes: `formatRangoFechas` from Task 3, `v.fechaDesde`/`v.fechaHasta` from Task 4's `mapViaje`.

- [ ] **Step 1: Show the range on `ViajeCard`**

In `mybolucompras/src/pages/ViajesPage.jsx`, add the import:

```javascript
import { formatRangoFechas } from '../utils/formatters';
```

In `ViajeCard`, after the `nombres` line, compute the range and render it under the participantes line:

```javascript
  const rango = formatRangoFechas(v.fechaDesde, v.fechaHasta);
```

```jsx
        {/* Participants */}
        <div className="viaje-card-participantes">{nombres}</div>
        {rango && <div className="viaje-card-fechas">📅 {rango}</div>}
```

- [ ] **Step 2: Show the range on `ViajeDetallePage` hero header**

In `mybolucompras/src/pages/ViajeDetallePage.jsx`, add the import:

```javascript
import { formatRangoFechas } from '../utils/formatters';
```

Right after `const activo = viaje.estado === 'activo';` add:

```javascript
  const rango = formatRangoFechas(viaje.fechaDesde, viaje.fechaHasta);
```

In the JSX, right after the `viaje-hero-badge` div and before `viaje-hero-avatars`, add:

```jsx
            {rango && <div className="viaje-hero-fechas">📅 {rango}</div>}
```

- [ ] **Step 3: Add CSS**

Append to `mybolucompras/src/styles/viajes.css`:

```css
.viaje-card-fechas {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.viaje-hero-fechas {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
}
```

- [ ] **Step 4: Manual verification**

Run the app, confirm a viaje with a date range shows "📅 DD mmm - DD mmm" both on its card in `/viajes` and on its detail header, and that a viaje without dates shows neither (no empty/broken line).

- [ ] **Step 5: Commit**

```bash
git add mybolucompras/src/pages/ViajesPage.jsx mybolucompras/src/pages/ViajeDetallePage.jsx mybolucompras/src/styles/viajes.css
git commit -m "feat(viajes): display date range on viaje card and detail header"
```

---

## Task 7: Add `tipo` (general/personal) support to `viajeNotasService`

**Files:**
- Modify: `mybolucompras/src/services/viajeNotasService.js` (`getChecklist`, `agregarItem`)

**Interfaces:**
- Produces: `viajeNotasService.getChecklist(viajeId)` items now include `tipo: 'general'|'personal'`; `viajeNotasService.agregarItem(viajeId, texto, userId, tipo = 'general')`.

- [ ] **Step 1: Update `getChecklist`**

```javascript
  async getChecklist(viajeId) {
    const { data, error } = await supabase
      .from('viaje_checklist')
      .select('*, autor:created_by(id, nombre, email)')
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      texto: row.texto,
      tipo: row.tipo || 'general',
      completadosPor: row.completados_por || [],
      createdBy: row.created_by,
      autorNombre: row.autor?.nombre || row.autor?.email || row.created_by,
    }));
  },
```

- [ ] **Step 2: Update `agregarItem`**

```javascript
  async agregarItem(viajeId, texto, userId, tipo = 'general') {
    const { error } = await supabase
      .from('viaje_checklist')
      .insert([{ viaje_id: viajeId, texto, tipo, completados_por: [], created_by: userId }]);
    if (error) throw error;
  },
```

- [ ] **Step 3: Manual verification**

Run the app. Since the UI doesn't pass `tipo` yet (that's Task 8), items added right now default to `'general'` — confirm the checklist tab still loads and works exactly as before (no regression) by opening a viaje's Notas tab and adding/toggling/deleting an item.

- [ ] **Step 4: Commit**

```bash
git add mybolucompras/src/services/viajeNotasService.js
git commit -m "feat(viajes): add tipo (general/personal) support to viajeNotasService"
```

---

## Task 8: General/Personal toggle UI in the checklist (Notas tab)

**Files:**
- Modify: `mybolucompras/src/pages/ViajeDetallePage.jsx` (`TabNotas` component)
- Modify: `mybolucompras/src/styles/viajes.css` (append)

**Interfaces:**
- Consumes: `viajeNotasService.getChecklist`/`agregarItem` from Task 7 (now returning/accepting `tipo`).

**Behavior:** two sub-tabs, "General" and "Personal". General items are visible to and completable by all participants (current behavior, unchanged). Personal items are only ever shown when the currently-selected sub-tab is Personal, and per the DB's RLS, `getChecklist` will only actually return personal items created by the current user (RLS already enforces this — the client-side filter here is purely about which sub-tab is currently displayed, not an additional security boundary).

- [ ] **Step 1: Add sub-tab state and filtering in `TabNotas`**

In `TabNotas`, add a new state variable alongside the existing ones:

```javascript
  const [checklistTab, setChecklistTab] = useState('general'); // 'general' | 'personal'
```

Change `handleAgregarItem` to pass the active sub-tab's `tipo`:

```javascript
  const handleAgregarItem = async () => {
    if (!nuevoItem.trim()) return;
    try {
      await viajeNotasService.agregarItem(viaje.id, nuevoItem.trim(), currentUserId, checklistTab);
      setNuevoItem(''); setShowItemInput(false);
      cargar();
    } catch { addToast('Error al agregar', 'error'); }
  };
```

Add a filtered list right before the checklist header section:

```javascript
  const checklistFiltrado = checklist.filter(item => item.tipo === checklistTab);
```

- [ ] **Step 2: Add the toggle to the JSX and filter the rendered list**

Replace the checklist header block:

```jsx
      {/* Checklist */}
      <div className="viaje-notas-section-header">
        <div className="viaje-seg-tabs" style={{ margin: 0 }}>
          <button
            className={`viaje-seg-btn${checklistTab === 'general' ? ' active' : ''}`}
            onClick={() => setChecklistTab('general')}
          >General</button>
          <button
            className={`viaje-seg-btn${checklistTab === 'personal' ? ' active' : ''}`}
            onClick={() => setChecklistTab('personal')}
          >Personal</button>
        </div>
        {activo && (
          <button className="viaje-notas-add-btn" onClick={() => setShowItemInput(v => !v)}>
            <IoAddCircleOutline size={22} />
          </button>
        )}
      </div>
```

Change the checklist `.map(...)` call to iterate `checklistFiltrado` instead of `checklist`, and only render the "Esperando a: ..." pending line and author name for `general` items:

```jsx
      {checklistFiltrado.map(item => {
        const completadosPor = item.completadosPor ?? [];
        const completadoPorMi = completadosPor.includes(currentUserId);
        const pendientes = viaje.participantes.filter(p => !completadosPor.includes(p.userId));
        const todosCompletaron = item.tipo === 'general' && viaje.participantes.length > 0 && pendientes.length === 0;
        const alguienMarcó = completadosPor.length > 0;
        const CheckIcon = todosCompletaron ? IoCheckmarkCircle : completadoPorMi ? IoCheckmarkCircleOutline : IoEllipseOutline;

        return (
          <div key={item.id} className="viaje-checklist-item" onClick={() => handleToggle(item)}>
            <CheckIcon size={22} className={`viaje-checklist-check${todosCompletaron || completadoPorMi ? ' done' : ''}`} />
            <div style={{ flex: 1 }}>
              <div className={`viaje-checklist-texto${todosCompletaron ? ' done' : ''}`}>{item.texto}</div>
              {item.tipo === 'general' && !todosCompletaron && alguienMarcó && (
                <div className="viaje-checklist-esperando">
                  Esperando a: {pendientes.map(p => p.nombre.split(' ')[0]).join(', ')}
                </div>
              )}
            </div>
            {item.tipo === 'general' && <span className="viaje-checklist-autor">{item.autorNombre.split(' ')[0]}</span>}
            {item.createdBy === currentUserId && activo && (
              <button className="viaje-checklist-del" onClick={e => { e.stopPropagation(); handleEliminarItem(item.id); }}>
                <IoTrashOutline size={14} />
              </button>
            )}
          </div>
        );
      })}
```

Empty-state: if `checklistFiltrado.length === 0`, show a small hint. Add right after the `.map(...)` block:

```jsx
      {checklistFiltrado.length === 0 && (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 'var(--space-3) 0' }}>
          {checklistTab === 'general' ? 'Sin ítems generales todavía' : 'Sin ítems personales todavía'}
        </div>
      )}
```

- [ ] **Step 3: Add spacing CSS for the sub-tab toggle inside the notas header**

Append to `mybolucompras/src/styles/viajes.css`:

```css
.viaje-notas-section-header .viaje-seg-tabs {
  flex: 1;
  max-width: 220px;
}
```

- [ ] **Step 4: Manual verification**

Run the app, open a viaje's Notas tab. Confirm: General tab shows existing items (backward compatible — all pre-existing items default to `general` per Task 7's DB default), adding an item while on General tab creates a `general` item visible to all participants (verify with a second test account added as participant), switching to Personal and adding an item creates one only you can see (log in as the other participant and confirm it's absent from their Personal tab, since RLS restricts `personal` items to their creator), and the "Esperando a..." text only appears on General items.

- [ ] **Step 5: Commit**

```bash
git add mybolucompras/src/pages/ViajeDetallePage.jsx mybolucompras/src/styles/viajes.css
git commit -m "feat(viajes): split checklist into General/Personal tabs"
```

---

## Task 9: Thread Modo Viaje fields through `configuracionService`

**Files:**
- Modify: `mybolucompras/src/services/configuracionService.js` (`getDefaults`, `mapFromDB`, `mapToDB`)
- Modify: `mybolucompras/src/context/DataContext.jsx` (default `mydata` shape)

**Interfaces:**
- Produces: `configuracionService.get()`/`.actualizar(config)` now round-trip `modoViajeActivo: boolean`, `modoViajeViajeId: string|null`, `modoViajePromptedIds: string[]`.

- [ ] **Step 1: Update `configuracionService.js`**

In `getDefaults()`, add the three new fields to the returned object:

```javascript
    monedaPreferida: 'ARS',
    modoViajeActivo: false,
    modoViajeViajeId: null,
    modoViajePromptedIds: [],
```

In `mapFromDB(row)`, add:

```javascript
    modoViajeActivo: row.modo_viaje_activo ?? false,
    modoViajeViajeId: row.modo_viaje_viaje_id || null,
    modoViajePromptedIds: row.modo_viaje_prompted_ids || [],
```

Find `mapToDB(config)` (below `mapFromDB`) and add the corresponding reverse mapping — read the function first to see its existing shape, then add:

```javascript
    modo_viaje_activo: config.modoViajeActivo ?? false,
    modo_viaje_viaje_id: config.modoViajeViajeId || null,
    modo_viaje_prompted_ids: config.modoViajePromptedIds || [],
```

- [ ] **Step 2: Update `DataContext.jsx`'s default `mydata` shape**

In `DataProvider`, the non-demo default object passed to `useState` currently is:

```javascript
  const [mydata, setMydata] = useState(demo ? DEMO_MYDATA : {
    cierre: '', vencimiento: '', cierreAnterior: '', vencimientoAnterior: '',
    fondos: 0, etiquetas: [], presupuestos: {},
    bancosHabilitados: [], mediosHabilitados: [], monedaPreferida: 'ARS',
  });
```

Add the three fields:

```javascript
  const [mydata, setMydata] = useState(demo ? DEMO_MYDATA : {
    cierre: '', vencimiento: '', cierreAnterior: '', vencimientoAnterior: '',
    fondos: 0, etiquetas: [], presupuestos: {},
    bancosHabilitados: [], mediosHabilitados: [], monedaPreferida: 'ARS',
    modoViajeActivo: false, modoViajeViajeId: null, modoViajePromptedIds: [],
  });
```

- [ ] **Step 3: Manual verification**

Run the app, log in, open devtools console and run `JSON.parse(localStorage.getItem('...'))`-style inspection isn't needed — instead, just confirm the app loads without console errors on `/` and `/configuracion` (this task only adds passthrough fields; nothing reads/writes them yet).

- [ ] **Step 4: Commit**

```bash
git add mybolucompras/src/services/configuracionService.js mybolucompras/src/context/DataContext.jsx
git commit -m "feat(config): thread modo viaje fields through configuracionService"
```

---

## Task 10: `ModoViajeModal` component

**Files:**
- Create: `mybolucompras/src/components/ModoViajeModal.jsx`
- Modify: `mybolucompras/src/styles/modal.css` (append, if the switch styles need scoping — otherwise reuse global `switch-track`/`switch-thumb` from `table.css` as-is)

**Interfaces:**
- Produces: `<ModoViajeModal viaje={viajeOrNull} onConfirm={(activar: boolean) => Promise<void>} />` — renders nothing when `viaje` is `null`; calls `onConfirm(true)` if the user toggled the switch on before confirming, `onConfirm(false)` otherwise (including closing/dismissing).

- [ ] **Step 1: Write the component**

```jsx
// src/components/ModoViajeModal.jsx
import React, { useState } from 'react';
import { IoAirplane } from 'react-icons/io5';

export default function ModoViajeModal({ viaje, onConfirm }) {
  const [activar, setActivar] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!viaje) return null;

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      await onConfirm(activar);
    } finally {
      setLoading(false);
      setActivar(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 380, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
          <div className="modal-icon modal-icon-primary" style={{ width: 56, height: 56 }}>
            <IoAirplane size={28} />
          </div>
        </div>
        <div className="modal-title" style={{ marginBottom: 'var(--space-2)' }}>¿Activar Modo Viaje?</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
          {viaje.emoji} {viaje.titulo} ya empezó. Con Modo Viaje activado, la app te va a llevar directo a
          este viaje cada vez que la abras.
        </p>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
            padding: '10px 14px', marginBottom: 'var(--space-4)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>Activar Modo Viaje</span>
          <div
            className={`switch-track${activar ? ' on' : ''}`}
            style={{ width: 48, height: 26 }}
            onClick={() => !loading && setActivar(v => !v)}
          >
            <div className="switch-thumb" style={{ width: 18, height: 18, top: 4, left: activar ? 26 : 4 }} />
          </div>
        </div>
        <button className="viajes-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleConfirmar} disabled={loading}>
          {loading ? 'Guardando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

This component has no route of its own yet — verification happens as part of Task 11 once `ModoViajeChecker` renders it. Skip a standalone check; move directly to Task 11 and verify both together.

- [ ] **Step 3: Commit**

```bash
git add mybolucompras/src/components/ModoViajeModal.jsx
git commit -m "feat(modo-viaje): add ModoViajeModal component"
```

---

## Task 11: `ModoViajeChecker` component, mounted app-wide

**Files:**
- Create: `mybolucompras/src/components/ModoViajeChecker.jsx`
- Modify: `mybolucompras/src/App.jsx` (mount `<ModoViajeChecker />` inside `<Router>`)

**Interfaces:**
- Consumes: `configuracionService.get()`/`.actualizar(config)` from Task 9, `viajesService.getAll()` (existing), `ModoViajeModal` from Task 10, `useAuth()` (existing), `useNavigate()` from `react-router-dom`.
- Produces: a self-contained component with no props, safe to mount once at the app root; it fetches its own data (does not rely on `DataProvider`/`ViajesProvider` being mounted on the current route, since those are route-scoped in `App.jsx` and this component must work on every route).

**Design note:** unlike `DataContext`/`ViajesContext` (mounted per-route), this component fetches directly via the services so it works regardless of which page is currently active. It re-checks whenever the user changes (login/logout) and once per app load; it does not poll continuously (desktop app, not a phone that reopens often — checking once per session load, plus once right after the user confirms the modal, is enough).

- [ ] **Step 1: Write the component**

```jsx
// src/components/ModoViajeChecker.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { configuracionService } from '../services/configuracionService';
import { viajesService } from '../services/viajesService';
import ModoViajeModal from './ModoViajeModal';

function toISODate(date) {
  return date.toISOString().split('T')[0];
}

export default function ModoViajeChecker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [candidato, setCandidato] = useState(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!user) { redirectedRef.current = false; return; }

    let cancelled = false;

    (async () => {
      const [mydata, viajes] = await Promise.all([
        configuracionService.get(),
        viajesService.getAll(),
      ]);
      if (cancelled || !mydata) return;

      const viajesActivos = viajes.filter(v => v.estado === 'activo');
      const today = toISODate(new Date());

      if (mydata.modoViajeActivo) {
        const viaje = viajesActivos.find(v => v.id === mydata.modoViajeViajeId);
        let vencido = false;
        if (viaje?.fechaHasta) {
          const limite = new Date(`${viaje.fechaHasta}T00:00:00`);
          limite.setDate(limite.getDate() + 1);
          vencido = new Date(`${today}T00:00:00`) > limite;
        }

        if (!viaje || vencido) {
          await configuracionService.actualizar({ ...mydata, modoViajeActivo: false, modoViajeViajeId: null });
          return;
        }

        if (!redirectedRef.current) {
          redirectedRef.current = true;
          navigate(`/viajes/${viaje.id}`);
        }
        return;
      }

      const candidatos = viajesActivos
        .filter(v => v.fechaDesde && v.fechaHasta)
        .filter(v => v.fechaDesde <= today && today <= v.fechaHasta)
        .filter(v => !(mydata.modoViajePromptedIds || []).includes(v.id));

      if (candidatos.length > 0) {
        const elegido = candidatos.reduce(
          (max, v) => (v.fechaDesde > max.fechaDesde ? v : max),
          candidatos[0]
        );
        if (!cancelled) setCandidato(elegido);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const handleConfirmar = async (activar) => {
    const viaje = candidato;
    setCandidato(null);
    const mydata = await configuracionService.get();
    if (!mydata) return;
    const promptedIds = [...new Set([...(mydata.modoViajePromptedIds || []), viaje.id])];
    await configuracionService.actualizar({
      ...mydata,
      modoViajePromptedIds: promptedIds,
      ...(activar ? { modoViajeActivo: true, modoViajeViajeId: viaje.id } : {}),
    });
    if (activar) {
      redirectedRef.current = true;
      navigate(`/viajes/${viaje.id}`);
    }
  };

  return <ModoViajeModal viaje={candidato} onConfirm={handleConfirmar} />;
}
```

- [ ] **Step 2: Mount it in `App.jsx`**

Add the import near the top of `mybolucompras/src/App.jsx`:

```javascript
import ModoViajeChecker from './components/ModoViajeChecker';
```

Mount it inside `<Router>`, as a sibling of `<UpdateNotification />` (so it's always rendered regardless of route, and can use `useNavigate()`):

```jsx
      <Router>
        <UpdateNotification />
        <ModoViajeChecker />
        <ErrorBoundary>
```

- [ ] **Step 3: Manual verification**

Run the app. Case A (prompt flow): create a viaje with `fechaDesde`/`fechaHasta` spanning today, log out and back in (or reload the app), and confirm the `ModoViajeModal` appears offering to activate Modo Viaje; decline it, reload again, and confirm it does NOT reappear (it's now in `modoViajePromptedIds`). Case B (activate + redirect): trigger the prompt again for a different qualifying viaje (or manually clear `modoViajePromptedIds` for the same one via the Supabase dashboard), confirm the switch, and verify you land on `/viajes/:id` for that trip. Reload the whole app and confirm you're auto-redirected there again on load. Case C (auto-deactivate): edit that viaje's `fechaHasta` in the DB to be in the past, reload, and confirm Modo Viaje turns itself off (check `/configuracion` — see Task 12 — or re-inspect `configuracion_usuario` in Supabase) and you are NOT redirected.

- [ ] **Step 4: Commit**

```bash
git add mybolucompras/src/components/ModoViajeChecker.jsx mybolucompras/src/App.jsx
git commit -m "feat(modo-viaje): add ModoViajeChecker for auto-redirect/prompt/deactivate"
```

---

## Task 12: Manual Modo Viaje toggle in `ConfiguracionPage`

**Files:**
- Modify: `mybolucompras/src/pages/ConfiguracionPage.jsx`

**Interfaces:**
- Consumes: `useData()`'s `mydata`/`actualizarConfig` (existing, `actualizarConfig(nuevaConfig)` merges and persists immediately — see `DataContext.jsx`).

- [ ] **Step 1: Add the toggle**

In `mybolucompras/src/pages/ConfiguracionPage.jsx`, destructure `actualizarConfig` from `useData()`:

```javascript
  const { mydata, setMydata, actualizarConfig } = useData();
```

Add a handler:

```javascript
  const handleToggleModoViaje = async () => {
    try {
      await actualizarConfig({
        modoViajeActivo: !mydata.modoViajeActivo,
        ...(mydata.modoViajeActivo ? { modoViajeViajeId: null } : {}),
      });
      addToast(mydata.modoViajeActivo ? 'Modo Viaje desactivado' : 'Modo Viaje activado', 'success');
    } catch {
      addToast('Error al actualizar Modo Viaje', 'error');
    }
  };
```

Add a new `config-card` section to the JSX (matching the existing pattern used by the "Bancos habilitados"/"Medios de pago" sections — `<div className="config-card">` with a `config-card-title` and `config-card-desc`), placed after the existing cards, before the page's closing wrapper:

```jsx
        <div className="config-card">
          <div className="config-card-title">✈️ Modo Viaje</div>
          <p className="config-card-desc">
            Cuando está activo, la app te lleva directo al viaje seleccionado al abrirla.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {mydata.modoViajeActivo ? 'Activado' : 'Desactivado'}
            </span>
            <div
              className={`switch-track${mydata.modoViajeActivo ? ' on' : ''}`}
              style={{ width: 48, height: 26 }}
              onClick={handleToggleModoViaje}
            >
              <div className="switch-thumb" style={{ width: 18, height: 18, top: 4, left: mydata.modoViajeActivo ? 26 : 4 }} />
            </div>
          </div>
        </div>
```

- [ ] **Step 2: Manual verification**

Run the app, go to `/configuracion`, confirm the Modo Viaje section renders with the correct on/off state matching `mydata.modoViajeActivo`, toggling it off when active clears `modoViajeViajeId` too (reload and confirm you're no longer auto-redirected), and toggling it on manually (with no viaje selected) doesn't crash `ModoViajeChecker` (it should just do nothing useful until a viaje is prompted/selected — `modoViajeViajeId` stays `null` in that case, so `ModoViajeChecker`'s `viajesActivos.find(...)` returns `undefined` and the "deactivate" branch fires harmlessly on next load, turning it back off). If that edge case feels confusing to a user, note it but do not build additional UI for picking a viaje manually — that's out of scope; the toggle here mirrors mobile's manual off-switch, which only ever turns Modo Viaje *off*, so restrict the toggle to only being clickable when `mydata.modoViajeActivo` is `true` (turning off), matching mobile's actual scope instead of allowing an ambiguous manual "on" with no viaje. Adjust `handleToggleModoViaje`/the JSX so the switch only renders as interactive when there's something to turn off; render it as read-only/disabled when already off.

- [ ] **Step 3: Commit**

```bash
git add mybolucompras/src/pages/ConfiguracionPage.jsx
git commit -m "feat(modo-viaje): add manual off-switch in ConfiguracionPage"
```

---

## Task 13: `viajeActividadesService`

**Files:**
- Create: `mybolucompras/src/services/viajeActividadesService.js`

**Interfaces:**
- Produces:
  - `viajeActividadesService.getByViaje(viajeId) => Promise<Actividad[]>` where `Actividad = { id, fecha, hora, titulo, ubicacion, nota, createdBy, createdAt }` (`fecha` is ISO `YYYY-MM-DD`, `hora` is `HH:MM:SS` or `null`).
  - `viajeActividadesService.crear(viajeId, { fecha, hora, titulo, ubicacion, nota }, userId) => Promise<Actividad>`
  - `viajeActividadesService.eliminar(id) => Promise<void>`

- [ ] **Step 1: Write the service**

```javascript
// src/services/viajeActividadesService.js
import { supabase } from '../lib/supabase';

export const viajeActividadesService = {
  async getByViaje(viajeId) {
    const { data, error } = await supabase
      .from('viaje_actividades')
      .select('*')
      .eq('viaje_id', viajeId)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data.map(mapFromDB);
  },

  async crear(viajeId, actividad, userId) {
    const { data, error } = await supabase
      .from('viaje_actividades')
      .insert([{
        viaje_id: viajeId,
        fecha: actividad.fecha,
        hora: actividad.hora || null,
        titulo: actividad.titulo,
        ubicacion: actividad.ubicacion || null,
        nota: actividad.nota || null,
        created_by: userId,
      }])
      .select()
      .single();
    if (error) throw error;
    return mapFromDB(data);
  },

  async eliminar(id) {
    const { error } = await supabase.from('viaje_actividades').delete().eq('id', id);
    if (error) throw error;
  },
};

function mapFromDB(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    hora: row.hora,
    titulo: row.titulo,
    ubicacion: row.ubicacion || '',
    nota: row.nota || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 2: Manual verification**

There's no UI wired to this yet. Verify via the Supabase dashboard's SQL editor or table view: after Task 15 wires up the UI, come back and confirm rows created through the app appear correctly shaped. For now, just confirm the file has no syntax errors by running the dev server and checking the console for import errors (a stray import elsewhere referencing this file would fail the build) — since nothing imports it yet, this step is effectively a no-op sanity check; skip ahead to Task 14.

- [ ] **Step 3: Commit**

```bash
git add mybolucompras/src/services/viajeActividadesService.js
git commit -m "feat(viajes): add viajeActividadesService for trip calendar activities"
```

---

## Task 14: `TabCalendario` — day-strip UI in `ViajeDetallePage`

**Files:**
- Modify: `mybolucompras/src/pages/ViajeDetallePage.jsx` (add `TABS` entry, new `TabCalendario` function component, render branch)
- Modify: `mybolucompras/src/styles/viajes.css` (append day-strip styles)

**Interfaces:**
- Consumes: `viajeActividadesService.getByViaje` from Task 13, `viaje.fechaDesde`/`fechaHasta` from Task 4.
- Produces: a `TabCalendario({ viaje, currentUserId, activo })` component rendered as the 4th tab; used by Task 15 which adds the "add activity" modal into this same component.

- [ ] **Step 1: Add the tab label**

Change the `TABS` constant near the top of `ViajeDetallePage.jsx`:

```javascript
const TABS = ['💸 Gastos', '⚖️ Balance', '📅 Calendario', '✅ Notas'];
```

(Reordered so Calendario sits before Notas, matching mobile's placement — grep for `tabIdx === 2` further down in the file, since that index is currently `TabNotas`; it needs to shift.)

- [ ] **Step 2: Update the tab-index render branches**

Find the block:

```jsx
          {tabIdx === 0 && (
            <TabGastos viaje={viaje} gastos={gastos} onGastoAdded={cargar} onGastoDeleted={cargar} currentUserId={user?.id} />
          )}
          {tabIdx === 1 && (
            <TabBalance viaje={viaje} gastos={gastos} pagos={pagos} onRefresh={cargar} />
          )}
          {tabIdx === 2 && (
            <TabNotas viaje={viaje} currentUserId={user?.id} />
          )}
```

Replace with:

```jsx
          {tabIdx === 0 && (
            <TabGastos viaje={viaje} gastos={gastos} onGastoAdded={cargar} onGastoDeleted={cargar} currentUserId={user?.id} />
          )}
          {tabIdx === 1 && (
            <TabBalance viaje={viaje} gastos={gastos} pagos={pagos} onRefresh={cargar} />
          )}
          {tabIdx === 2 && (
            <TabCalendario viaje={viaje} currentUserId={user?.id} activo={activo} />
          )}
          {tabIdx === 3 && (
            <TabNotas viaje={viaje} currentUserId={user?.id} />
          )}
```

- [ ] **Step 3: Write `TabCalendario`, without the add-activity modal (that's Task 15)**

Add this new function component in `ViajeDetallePage.jsx`, right before the `// ── Tab Notas ───────────────────────────────` comment (i.e. after `TabBalance`, before `TabNotas`):

```jsx
// ── Tab Calendario ──────────────────────────
function computeDias(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) return [];
  const dias = [];
  let cur = new Date(`${fechaDesde}T00:00:00`);
  const end = new Date(`${fechaHasta}T00:00:00`);
  while (cur <= end) {
    dias.push(cur.toISOString().split('T')[0]);
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
  }
  return dias;
}

function TabCalendario({ viaje, currentUserId, activo }) {
  const addToast = useToast();
  const dias = computeDias(viaje.fechaDesde, viaje.fechaHasta);
  const [selectedDia, setSelectedDia] = useState(dias[0] || null);
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const stripRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const data = await viajeActividadesService.getByViaje(viaje.id);
      setActividades(data);
    } catch {
      addToast('Error al cargar el calendario', 'error');
    } finally {
      setLoading(false);
    }
  }, [viaje.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleEliminar = async (act) => {
    if (!window.confirm(`¿Eliminar "${act.titulo}"?`)) return;
    try {
      await viajeActividadesService.eliminar(act.id);
      addToast('Actividad eliminada', 'success');
      cargar();
    } catch {
      addToast('Error al eliminar', 'error');
    }
  };

  const scrollStrip = (dir) => {
    stripRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });
  };

  if (loading) return <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>Cargando…</div>;

  if (dias.length === 0) {
    return (
      <div className="viajes-empty" style={{ paddingTop: 'var(--space-8)' }}>
        <div className="viajes-empty-icon">📅</div>
        <div className="viajes-empty-title">Sin fechas configuradas</div>
        <p className="viajes-empty-sub">Editá el viaje y agregá fecha de inicio y fin para armar el itinerario</p>
      </div>
    );
  }

  const actividadesDelDia = actividades
    .filter(a => a.fecha === selectedDia)
    .sort((a, b) => (a.hora || '99:99').localeCompare(b.hora || '99:99'));

  return (
    <div>
      <div className="viaje-calendario-strip-wrap">
        <button className="viaje-calendario-strip-arrow" onClick={() => scrollStrip(-1)}>‹</button>
        <div className="viaje-calendario-strip" ref={stripRef}>
          {dias.map(dia => {
            const d = new Date(`${dia}T00:00:00`);
            const activo = dia === selectedDia;
            return (
              <button
                key={dia}
                className={`viaje-calendario-chip${activo ? ' selected' : ''}`}
                onClick={() => setSelectedDia(dia)}
              >
                <div className="viaje-calendario-chip-dow">{d.toLocaleDateString('es-AR', { weekday: 'short' })}</div>
                <div className="viaje-calendario-chip-day">{d.getDate()}</div>
              </button>
            );
          })}
        </div>
        <button className="viaje-calendario-strip-arrow" onClick={() => scrollStrip(1)}>›</button>
      </div>

      <div className="viaje-section-label">
        {new Date(`${selectedDia}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>

      {actividadesDelDia.length === 0 ? (
        <div className="viajes-empty" style={{ paddingTop: 'var(--space-6)' }}>
          <div className="viajes-empty-title">Sin actividades este día</div>
        </div>
      ) : (
        actividadesDelDia.map(act => (
          <div key={act.id} className="viaje-actividad-row">
            {act.hora && <div className="viaje-actividad-hora">{act.hora.slice(0, 5)}</div>}
            <div className="viaje-actividad-body">
              <div className="viaje-actividad-titulo">{act.titulo}</div>
              {act.ubicacion && <div className="viaje-actividad-meta">📍 {act.ubicacion}</div>}
              {act.nota && <div className="viaje-actividad-meta">{act.nota}</div>}
            </div>
            {activo && act.createdBy === currentUserId && (
              <button className="viaje-gasto-del-btn" onClick={() => handleEliminar(act)} title="Eliminar">
                <IoTrashOutline size={16} />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
```

Add the necessary imports at the top of `ViajeDetallePage.jsx`:

```javascript
import { viajeActividadesService } from '../services/viajeActividadesService';
```

(`useState`, `useEffect`, `useCallback`, `useRef` are already imported at the top of the file.)

- [ ] **Step 4: Add CSS for the day-strip and activity rows**

Append to `mybolucompras/src/styles/viajes.css`:

```css
.viaje-calendario-strip-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.viaje-calendario-strip {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 4px 2px;
  flex: 1;
}

.viaje-calendario-strip-arrow {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.viaje-calendario-chip {
  flex-shrink: 0;
  width: 52px;
  padding: 8px 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  text-align: center;
}

.viaje-calendario-chip.selected {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.viaje-calendario-chip-dow {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.7;
}

.viaje-calendario-chip-day {
  font-size: 16px;
  font-weight: 700;
}

.viaje-actividad-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}

.viaje-actividad-hora {
  flex-shrink: 0;
  font-weight: 700;
  font-size: 13px;
  color: var(--color-primary);
  min-width: 44px;
}

.viaje-actividad-body {
  flex: 1;
}

.viaje-actividad-titulo {
  font-size: 14px;
  font-weight: 600;
}

.viaje-actividad-meta {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}
```

- [ ] **Step 5: Manual verification**

Run the app. Open a viaje with a `fechaDesde`/`fechaHasta` range (from Task 5), click into the new "📅 Calendario" tab, confirm the day strip renders one chip per day in the range, clicking a chip selects it (highlighted) and the section label below shows the full date, and a viaje with no dates shows the "Sin fechas configuradas" empty state instead of crashing. Also open a viaje without a range to confirm the empty state renders correctly there too. There's no way to add activities yet (Task 15) — the day list will show "Sin actividades este día" for every day, which is correct at this point.

- [ ] **Step 6: Commit**

```bash
git add mybolucompras/src/pages/ViajeDetallePage.jsx mybolucompras/src/styles/viajes.css
git commit -m "feat(viajes): add Calendario tab with day-strip itinerary view"
```

---

## Task 15: `AgregarActividadModal` — add/delete activities

**Files:**
- Create: `mybolucompras/src/components/viajes/AgregarActividadModal.jsx`
- Modify: `mybolucompras/src/pages/ViajeDetallePage.jsx` (`TabCalendario`: wire the modal in)

**Interfaces:**
- Consumes: `viajeActividadesService.crear` from Task 13.
- Produces: `<AgregarActividadModal viaje={viaje} fecha={selectedDia} onClose={fn} onSave={fn}/>` where `onSave(actividadData)` receives `{ fecha, hora, titulo, ubicacion, nota }` and is expected to call the service and refresh.

- [ ] **Step 1: Write the modal**

```jsx
// src/components/viajes/AgregarActividadModal.jsx
import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

export default function AgregarActividadModal({ fecha, onClose, onSave }) {
  const [titulo, setTitulo] = useState('');
  const [hora, setHora] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleGuardar = async () => {
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        fecha,
        hora: hora || null,
        titulo: titulo.trim(),
        ubicacion: ubicacion.trim() || null,
        nota: nota.trim() || null,
      });
    } catch {
      setError('Error al guardar la actividad');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon modal-icon-primary">📅</div>
            <div className="modal-title">Agregar actividad</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><FiX size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div style={{ color: 'var(--color-error)', fontSize: 13 }}>{error}</div>}

          <div className="form-grid">
            <div className="form-field form-grid-full">
              <label className="form-label">Título *</label>
              <input className="form-input" placeholder="Ej: Check-in hotel" value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus />
            </div>
            <div className="form-field">
              <label className="form-label">Hora</label>
              <input className="form-input" type="time" value={hora} onChange={e => setHora(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Ubicación</label>
              <input className="form-input" placeholder="Opcional" value={ubicacion} onChange={e => setUbicacion(e.target.value)} />
            </div>
            <div className="form-field form-grid-full">
              <label className="form-label">Nota</label>
              <textarea className="form-input" placeholder="Opcional" value={nota} onChange={e => setNota(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="viajes-btn-primary" onClick={handleGuardar} disabled={saving}>
            {saving ? 'Guardando…' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `TabCalendario`**

Add the import at the top of `ViajeDetallePage.jsx`:

```javascript
import AgregarActividadModal from '../components/viajes/AgregarActividadModal';
```

In `TabCalendario`, add modal-open state and a save handler:

```javascript
  const [actividadModal, setActividadModal] = useState(false);

  const handleSaveActividad = async (data) => {
    try {
      await viajeActividadesService.crear(viaje.id, data, currentUserId);
      setActividadModal(false);
      addToast('Actividad agregada', 'success');
      cargar();
    } catch {
      addToast('Error al agregar la actividad', 'error');
      throw new Error('save failed');
    }
  };
```

Add a FAB button and the modal to the JSX, right after the activities list block (before the closing `</div>` of the component's returned root `<div>`):

```jsx
      {activo && (
        <button className="viaje-fab" onClick={() => setActividadModal(true)}>
          <IoAddOutline size={20} /> Agregar actividad
        </button>
      )}

      {actividadModal && (
        <AgregarActividadModal
          fecha={selectedDia}
          onClose={() => setActividadModal(false)}
          onSave={handleSaveActividad}
        />
      )}
```

`IoAddOutline` is already imported at the top of `ViajeDetallePage.jsx` (used by `TabGastos`).

- [ ] **Step 3: Manual verification**

Run the app, open the Calendario tab for an active viaje, click "Agregar actividad", fill in a title (and optionally hora/ubicación/nota), save, and confirm it appears in the selected day's list sorted correctly if you add a second one with an earlier time. Confirm the delete button (only visible to the activity's creator, only when the viaje is active) removes it after a confirm dialog. Reopen a closed/archived viaje's Calendario tab and confirm the "Agregar actividad" FAB is hidden (read-only, matching the other tabs' `activo` gating).

- [ ] **Step 4: Commit**

```bash
git add mybolucompras/src/components/viajes/AgregarActividadModal.jsx mybolucompras/src/pages/ViajeDetallePage.jsx
git commit -m "feat(viajes): add AgregarActividadModal, wire add/delete into Calendario tab"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1-2 cover spec §1 (fixes de fechas). Tasks 3-6 cover spec §2 (rango de fechas + editar viaje — no separate `EditarViajeModal` was created, per the spec's explicit call to reuse `CrearViajeModal`'s existing `isEdit` mode). Tasks 13-15 cover spec §3 (calendario, with the day-strip UX adaptation called out in the spec, no touch-carousel). Task 7-8 cover spec §4 gap A (checklist). Tasks 9-12 cover spec §4 gap B (modo viaje). Out-of-scope items (push notifications, AI report, Android version bumps) are correctly excluded — no task touches them.
- **Type/name consistency:** `viaje.fechaDesde`/`fechaHasta` (camelCase, from `mapViaje`) used consistently from Task 4 onward. `CrearViajeModal`'s `onSave` arity (`titulo, emoji, participanteIds, fechaDesde, fechaHasta`) is consistent between Task 5's modal change and its two call sites (`ViajesPage.handleCrear`, `ViajeDetallePage.handleEditSave`). `viajeNotasService.agregarItem`'s new `tipo` parameter (Task 7) matches its call site in Task 8. `configuracionService`'s `modoViajeActivo`/`modoViajeViajeId`/`modoViajePromptedIds` names are used identically across Tasks 9, 11, 12.
- **No placeholders:** every step has literal code, not descriptions of code.
