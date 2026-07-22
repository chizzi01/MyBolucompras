# Viaje Calendario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Calendario" tab to a viaje where participants set the trip's date range, schedule per-day activities (title/time/location/note), and receive an 8 AM push notification summarizing each day's activities.

**Architecture:** Two new DB pieces (`fecha_desde`/`fecha_hasta` on `viajes`, new `viaje_actividades` table) feed a new service/hook/mutation layer (mirroring the existing `viajeNotasService` pattern), surfaced through a new `ViajeCalendarioTab` (day-strip + agenda) wired into `ViajeDetailScreen`'s existing tab system. Trip dates are entered in `CrearViajeModal` and edited via a new `EditarViajeModal`. A separate server-side piece (Postgres `pg_cron` + a new Edge Function) runs independently of the app to send the daily push summary.

**Tech Stack:** React Native (Expo), Supabase (Postgres + Auth + Edge Functions/Deno), TanStack Query, `@react-native-community/datetimepicker`, FCM v1 (existing `send-push-notification` pattern).

## Global Constraints

- Supabase migrations in this project are applied manually via the dashboard SQL editor — they are never run automatically. Every migration file must keep the existing header comment convention (see `supabase/migrations/20260721_viaje_checklist_personal.sql`) stating this.
- No automated test suite exists in this project (no `test` script in `package.json`, no test files for any trip feature). Verification for every task is manual: run the app (`expo start`) and/or run SQL/HTTP commands directly, per existing project convention.
- Dates stored in Postgres `date` columns must be computed and compared using **local calendar dates**, not UTC-shifted ones — Argentina is UTC-3, so `Date.toISOString().split('T')[0]` can silently roll a day backward/forward. Use the new `toISODate`/`parseISODate` helpers from Task 1 everywhere a JS `Date` needs to become/come from a `date` column.
- Activities are shared (no personal/general split) — any participant can create, edit, or delete any activity, matching RLS with no `created_by` restriction (this differs from the checklist's personal/general split; do not copy that pattern here).
- Match existing code style: no comments unless explaining non-obvious rationale, `dark`/`colors`/`spacing`/`radius`/`typography` theme props threaded the same way `ViajeNotasTab.jsx` and `CrearViajeModal.jsx` already do.

---

## Task 1: Database migration — trip dates + activities table

**Files:**
- Create: `supabase/migrations/20260722_viaje_calendario.sql`
- Modify: `src/utils/formatters.js` (add `toISODate`/`parseISODate` helpers used by later tasks)

**Interfaces:**
- Produces: Postgres columns `public.viajes.fecha_desde date`, `public.viajes.fecha_hasta date`; table `public.viaje_actividades(id, viaje_id, fecha, hora, titulo, ubicacion, nota, created_by, created_at)`; JS helpers `toISODate(date: Date): string` (returns local `YYYY-MM-DD`) and `parseISODate(iso: string): Date | null` (returns local midnight `Date`), both exported from `src/utils/formatters.js`.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260722_viaje_calendario.sql`:

```sql
-- supabase/migrations/20260722_viaje_calendario.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: public.viajes and public.viaje_participantes must already exist
-- (see 20260528_modo_viaje.sql).

-- 1. Trip date range, set at creation or via edit, both nullable.
ALTER TABLE public.viajes
  ADD COLUMN IF NOT EXISTS fecha_desde date,
  ADD COLUMN IF NOT EXISTS fecha_hasta date;

-- 2. viaje_actividades: shared itinerary items for a specific day of the trip.
CREATE TABLE IF NOT EXISTS public.viaje_actividades (
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
ALTER TABLE public.viaje_actividades
  ADD CONSTRAINT viaje_actividades_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.viaje_actividades ENABLE ROW LEVEL SECURITY;

-- Shared across all participants — no personal/general split, unlike viaje_checklist.
CREATE POLICY "va_all" ON public.viaje_actividades
  USING (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()))
  WITH CHECK (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_va_viaje_id ON public.viaje_actividades(viaje_id);
CREATE INDEX IF NOT EXISTS idx_va_viaje_fecha ON public.viaje_actividades(viaje_id, fecha);
```

- [ ] **Step 2: Apply the migration manually and verify**

Run the SQL above in the Supabase dashboard SQL Editor for this project. Then verify with:

```sql
select fecha_desde, fecha_hasta from public.viajes limit 1;
select * from public.viaje_actividades limit 1;
```

Expected: both queries run without error (empty result sets are fine — the columns/table exist).

- [ ] **Step 3: Add date helpers to `src/utils/formatters.js`**

Open `src/utils/formatters.js` and add, after the existing `formatFecha` function (after line 17):

```js
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
```

- [ ] **Step 4: Manually verify the helpers**

Run: `node -e "const {toISODate, parseISODate} = require('./src/utils/formatters.js'); console.log(toISODate(new Date(2026,6,22))); console.log(parseISODate('2026-07-22').toDateString());"` from the project root.

Expected output:
```
2026-07-22
Wed Jul 22 2026
```

(If the project's `formatters.js` uses ES module `export` syntax and this direct `node -e` require fails with a syntax error, instead verify by temporarily adding `console.log(toISODate(new Date()), parseISODate('2026-07-22'))` inside `CrearViajeModal.jsx`'s render in Task 3 once it's wired up, then remove the debug line.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260722_viaje_calendario.sql src/utils/formatters.js
git commit -m "feat: add viaje date range columns and viaje_actividades table"
```

---

## Task 2: Extend `viajesService` for trip date range

**Files:**
- Modify: `src/services/viajesService.js:37-73` (`crear`), `src/services/viajesService.js:178-188` (`editarViaje`), `src/services/viajesService.js:191-209` (`mapViaje`)
- Modify: `src/hooks/mutations/useViajeMutations.js:10-14` (`crear` mutation)

**Interfaces:**
- Consumes: `toISODate` from Task 1 (`src/utils/formatters.js`) — used by callers in Task 3/4, not inside this task.
- Produces: `viajesService.crear(titulo, emoji, participanteIds, imagenUrl = null, fechaDesde = null, fechaHasta = null)`; `viajesService.editarViaje(id, campos)` now also accepts `campos.fechaDesde` / `campos.fechaHasta` (ISO date strings or `null`); `mapViaje(row)` output now includes `fechaDesde` and `fechaHasta`. `useViajeMutations().crear` mutation now accepts `{ titulo, emoji, participanteIds, imagenUrl, fechaDesde, fechaHasta }`.

- [ ] **Step 1: Extend `crear` in `viajesService.js`**

In `src/services/viajesService.js`, change line 37 and the insert on lines 42-46:

```js
  async crear(titulo, emoji, participanteIds, imagenUrl = null, fechaDesde = null, fechaHasta = null) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');

    const { data: viaje, error } = await supabase
      .from('viajes')
      .insert([{ titulo, emoji, imagen_url: imagenUrl, created_by: user.id, fecha_desde: fechaDesde, fecha_hasta: fechaHasta }])
      .select()
      .single();
    if (error) throw error;
```

- [ ] **Step 2: Extend `editarViaje` in `viajesService.js`**

Replace the `editarViaje` function (currently lines 178-188):

```js
  async editarViaje(id, campos) {
    const update = {};
    if (campos.titulo !== undefined) update.titulo = campos.titulo;
    if (campos.emoji !== undefined) update.emoji = campos.emoji;
    if ('imagenUrl' in campos) update.imagen_url = campos.imagenUrl;
    if ('fechaDesde' in campos) update.fecha_desde = campos.fechaDesde;
    if ('fechaHasta' in campos) update.fecha_hasta = campos.fechaHasta;
    const { error } = await supabase
      .from('viajes')
      .update(update)
      .eq('id', id);
    if (error) throw error;
  },
```

- [ ] **Step 3: Extend `mapViaje` in `viajesService.js`**

In the `mapViaje` function (currently lines 191-209), add two fields after `imagenUrl` (line 197):

```js
    imagenUrl: row.imagen_url ?? null,
    fechaDesde: row.fecha_desde ?? null,
    fechaHasta: row.fecha_hasta ?? null,
```

- [ ] **Step 4: Extend the `crear` mutation in `useViajeMutations.js`**

In `src/hooks/mutations/useViajeMutations.js`, replace lines 10-14:

```js
  const crear = useMutation({
    mutationFn: ({ titulo, emoji, participanteIds, imagenUrl = null, fechaDesde = null, fechaHasta = null }) =>
      viajesService.crear(titulo, emoji, participanteIds, imagenUrl, fechaDesde, fechaHasta),
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });
```

- [ ] **Step 5: Manually verify**

Run `expo start`, open the app, go to "Crear viaje", submit with just a título (no dates yet — Task 3 adds the date fields). Confirm the trip is created without errors, same as before this change (regression check — `fechaDesde`/`fechaHasta` default to `null` so existing behavior is unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/services/viajesService.js src/hooks/mutations/useViajeMutations.js
git commit -m "feat: thread fecha_desde/fecha_hasta through viajesService"
```

---

## Task 3: Shared date/time picker + trip dates in `CrearViajeModal`

**Files:**
- Create: `src/components/common/DateTimeField.jsx`
- Modify: `src/components/viajes/CrearViajeModal.jsx`

**Interfaces:**
- Consumes: `toISODate` from `src/utils/formatters.js` (Task 1).
- Produces: `DateTimeField({ value: Date | null, onChange: (date: Date) => void, dark: boolean, mode?: 'date' | 'time', placeholder?: string, style? })` — a reusable native date/time picker button, following the same Android-inline / iOS-modal pattern as `DatePickerField` in `src/screens/AgregarDeudaModal.jsx:434-486`. Later tasks (`EditarViajeModal`, `AgregarActividadModal`) import this component.

- [ ] **Step 1: Create `DateTimeField.jsx`**

```jsx
// src/components/common/DateTimeField.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function DateTimeField({ value, onChange, dark, mode = 'date', placeholder, style }) {
  const [show, setShow] = useState(false);
  const dateObj = value instanceof Date && !isNaN(value) ? value : new Date();

  const handleChange = (event, selected) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') return;
    if (selected) onChange(selected);
  };

  const displayText = value
    ? mode === 'time'
      ? value.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      : value.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : (placeholder || (mode === 'time' ? 'Seleccionar hora' : 'Seleccionar fecha'));

  const border = dark ? colors.border.dark : colors.border.light;
  const inputBg = dark ? '#0F172A' : '#F8FAFC';
  const textColor = value
    ? (dark ? colors.text.dark : colors.text.light)
    : (dark ? colors.textSecondary.dark : colors.textSecondary.light);
  const modalBg = dark ? '#1E293B' : '#fff';
  const titleColor = dark ? colors.text.dark : colors.text.light;

  return (
    <View style={style}>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: inputBg, borderColor: border }]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
          size={16}
          color={dark ? colors.textSecondary.dark : colors.textSecondary.light}
        />
        <Text style={[styles.btnText, { color: textColor }]}>{displayText}</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && show && (
        <DateTimePicker value={dateObj} mode={mode} display="default" onChange={handleChange} />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={styles.modalBg}>
            <View style={[styles.modalCard, { backgroundColor: modalBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: titleColor }]}>
                  {mode === 'time' ? 'Seleccionar hora' : 'Seleccionar fecha'}
                </Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.modalDone}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateObj}
                mode={mode}
                display="spinner"
                onChange={handleChange}
                textColor={titleColor}
                locale="es-AR"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  btnText: { ...typography.body },
  modalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: 20 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#33415533',
  },
  modalTitle: { ...typography.bodyMed },
  modalDone: { color: colors.primary, fontWeight: '700' },
});
```

- [ ] **Step 2: Add trip date state and validation to `CrearViajeModal.jsx`**

In `src/components/viajes/CrearViajeModal.jsx`, add imports after line 8:

```jsx
import DateTimeField from '../common/DateTimeField';
import { toISODate } from '../../utils/formatters';
```

Add state after line 32 (`const [showGaleria, setShowGaleria] = useState(false);`):

```jsx
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);
```

- [ ] **Step 3: Add validation and pass dates through in `handleCrear`**

Replace the `handleCrear` function (currently lines 57-78):

```jsx
  const handleCrear = async () => {
    if (!titulo.trim()) { setError('El título es requerido.'); return; }
    if (fechaDesde && fechaHasta && fechaHasta < fechaDesde) {
      setError('La fecha "hasta" no puede ser anterior a la fecha "desde".');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await crearMutation.mutateAsync({
        titulo: titulo.trim(),
        emoji,
        participanteIds: participantes.map(p => p.id),
        imagenUrl,
        fechaDesde: fechaDesde ? toISODate(fechaDesde) : null,
        fechaHasta: fechaHasta ? toISODate(fechaHasta) : null,
      });
      setTitulo('');
      setEmoji('✈️');
      setParticipantes([]);
      setImagenUrl(null);
      setFechaDesde(null);
      setFechaHasta(null);
      onClose();
    } catch (err) {
      setError('Error al crear el viaje: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 4: Add the date fields to the form UI**

In `src/components/viajes/CrearViajeModal.jsx`, insert a new section right after the título `TextInput` block (after line 137, before the `PARTICIPANTES` label on line 139):

```jsx
            <Text style={[styles.label, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
              FECHAS DEL VIAJE <Text style={{ textTransform: 'none', fontWeight: '400' }}>(opcional)</Text>
            </Text>
            <View style={styles.fechasRow}>
              <DateTimeField
                value={fechaDesde}
                onChange={setFechaDesde}
                dark={dark}
                placeholder="Desde"
                style={{ flex: 1 }}
              />
              <DateTimeField
                value={fechaHasta}
                onChange={setFechaHasta}
                dark={dark}
                placeholder="Hasta"
                style={{ flex: 1 }}
              />
            </View>
```

Add `fechasRow` to the `styles` object (after `label` on line 218):

```jsx
  fechasRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
```

- [ ] **Step 5: Manually verify**

Run `expo start`, open "Crear viaje", set título "Test Calendario", pick a Desde date and a Hasta date before it — confirm the inline error "La fecha... no puede ser anterior..." appears and the trip is not created. Then set a valid Hasta (same day or later), submit, and confirm the trip is created successfully. Check in the Supabase dashboard (`select titulo, fecha_desde, fecha_hasta from viajes order by created_at desc limit 1;`) that both dates were saved as the expected `YYYY-MM-DD` values (matching the local dates picked, not shifted by a day).

- [ ] **Step 6: Commit**

```bash
git add src/components/common/DateTimeField.jsx src/components/viajes/CrearViajeModal.jsx
git commit -m "feat: add trip date range fields to CrearViajeModal"
```

---

## Task 4: `EditarViajeModal` + option in `ViajeOpcionesSheet`

**Files:**
- Create: `src/components/viajes/EditarViajeModal.jsx`
- Modify: `src/components/viajes/ViajeOpcionesSheet.jsx`

**Interfaces:**
- Consumes: `DateTimeField` (Task 3), `toISODate`/`parseISODate` (Task 1), `useViajeMutations().editar` (existing, extended in Task 2).
- Produces: `EditarViajeModal({ visible, onClose, viaje, dark })` — participants reach it via a new "Editar viaje" option in `ViajeOpcionesSheet`, creator-only, same gating as "Cambiar imagen de portada".

- [ ] **Step 1: Create `EditarViajeModal.jsx`**

```jsx
// src/components/viajes/EditarViajeModal.jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useViajeMutations } from '../../hooks/mutations/useViajeMutations';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { toISODate, parseISODate } from '../../utils/formatters';
import DateTimeField from '../common/DateTimeField';

const EMOJIS = ['✈️', '🏔️', '🌊', '🌴', '🎿', '🏖️', '🎒', '🗺️'];

export default function EditarViajeModal({ visible, onClose, viaje, dark: darkProp }) {
  const { dark: darkTheme } = useTheme();
  const dark = darkProp ?? darkTheme;
  const { editar: editarMutation } = useViajeMutations();
  const insets = useSafeAreaInsets();

  const [titulo, setTitulo] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && viaje) {
      setTitulo(viaje.titulo);
      setEmoji(viaje.emoji);
      setFechaDesde(parseISODate(viaje.fechaDesde));
      setFechaHasta(parseISODate(viaje.fechaHasta));
      setError('');
    }
  }, [visible, viaje]);

  const handleGuardar = async () => {
    if (!titulo.trim()) { setError('El título es requerido.'); return; }
    if (fechaDesde && fechaHasta && fechaHasta < fechaDesde) {
      setError('La fecha "hasta" no puede ser anterior a la fecha "desde".');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await editarMutation.mutateAsync({
        id: viaje.id,
        campos: {
          titulo: titulo.trim(),
          emoji,
          fechaDesde: fechaDesde ? toISODate(fechaDesde) : null,
          fechaHasta: fechaHasta ? toISODate(fechaHasta) : null,
        },
      });
      onClose();
    } catch (err) {
      setError('Error al guardar los cambios: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const bg = dark ? colors.background.dark : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const inputBg = dark ? '#0F172A' : '#F8FAFC';
  const border = dark ? colors.border.dark : colors.border.light;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: textColor }]}>Editar Viaje</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]}
              placeholder="Nombre del viaje"
              placeholderTextColor={dark ? '#475569' : '#94A3B8'}
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={[styles.label, { color: dark ? colors.textSecondary.dark : colors.textSecondary.light }]}>
              FECHAS DEL VIAJE <Text style={{ textTransform: 'none', fontWeight: '400' }}>(opcional)</Text>
            </Text>
            <View style={styles.fechasRow}>
              <DateTimeField value={fechaDesde} onChange={setFechaDesde} dark={dark} placeholder="Desde" style={{ flex: 1 }} />
              <DateTimeField value={fechaHasta} onChange={setFechaHasta} dark={dark} placeholder="Hasta" style={{ flex: 1 }} />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={handleGuardar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Guardar cambios</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: dark ? colors.textSecondary.dark : colors.textSecondary.light }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md },
  handle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h2, marginBottom: spacing.md },
  emojiBtn: { padding: 8, marginRight: 6, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent' },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, ...typography.body, marginBottom: spacing.md },
  label: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fechasRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  error: { color: colors.error, fontSize: 13, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
```

- [ ] **Step 2: Wire "Editar viaje" option into `ViajeOpcionesSheet.jsx`**

In `src/components/viajes/ViajeOpcionesSheet.jsx`, add the import after line 13:

```jsx
import EditarViajeModal from './EditarViajeModal';
```

Add state after line 21 (`const [showImagenGaleria, setShowImagenGaleria] = useState(false);`):

```jsx
  const [showEditar, setShowEditar] = useState(false);
```

Add a new `Option` right before "Cambiar imagen de portada" (before line 71's block, i.e. right after the "Cerrar viaje" block ending at line 70):

```jsx
            {esCreador && (
              <Option
                icon="create-outline"
                label="Editar viaje"
                onPress={() => setShowEditar(true)}
              />
            )}
```

Add the modal render after `ImagenGaleriaModal`'s closing tag (after line 113, before the closing `</>` on line 114):

```jsx
      <EditarViajeModal
        visible={showEditar}
        onClose={() => setShowEditar(false)}
        viaje={viaje}
        dark={dark}
      />
```

- [ ] **Step 3: Manually verify**

Run `expo start`, open a trip you created, tap the "…" options menu — confirm "Editar viaje" appears above "Cambiar imagen de portada". Tap it, confirm título/emoji/fechas are pre-filled from the trip, change the título and set both dates, save, and confirm the trip detail header now reflects the new título and (via `select fecha_desde, fecha_hasta from viajes where id = '<id>';` in Supabase) the new dates.

- [ ] **Step 4: Commit**

```bash
git add src/components/viajes/EditarViajeModal.jsx src/components/viajes/ViajeOpcionesSheet.jsx
git commit -m "feat: add EditarViajeModal for editing trip title, emoji, and dates"
```

---

## Task 5: `viajeActividadesService`

**Files:**
- Create: `src/services/viajeActividadesService.js`

**Interfaces:**
- Produces: `viajeActividadesService.getByViaje(viajeId): Promise<Actividad[]>`, `.crear(viajeId, { fecha, hora, titulo, ubicacion, nota }): Promise<Actividad>`, `.editar(id, campos): Promise<Actividad>`, `.eliminar(id): Promise<void>`, where `Actividad = { id, viajeId, fecha, hora: string|null ('HH:mm'), titulo, ubicacion, nota, createdBy, autorNombre, createdAt }`. Consumed by Task 6's hooks.

- [ ] **Step 1: Create the service**

```js
// src/services/viajeActividadesService.js
import { supabase } from '../lib/supabase';

export const viajeActividadesService = {
  async getByViaje(viajeId) {
    const { data, error } = await supabase
      .from('viaje_actividades')
      .select('*, autor:created_by(id, nombre, email)')
      .eq('viaje_id', viajeId)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data.map(mapActividad);
  },

  async crear(viajeId, { fecha, hora = null, titulo, ubicacion = null, nota = null }) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('viaje_actividades')
      .insert([{ viaje_id: viajeId, fecha, hora, titulo, ubicacion, nota, created_by: user.id }])
      .select('*, autor:created_by(id, nombre, email)')
      .single();
    if (error) throw error;
    return mapActividad(data);
  },

  async editar(id, campos) {
    const update = {};
    if (campos.fecha !== undefined) update.fecha = campos.fecha;
    if ('hora' in campos) update.hora = campos.hora;
    if (campos.titulo !== undefined) update.titulo = campos.titulo;
    if ('ubicacion' in campos) update.ubicacion = campos.ubicacion;
    if ('nota' in campos) update.nota = campos.nota;
    const { data, error } = await supabase
      .from('viaje_actividades')
      .update(update)
      .eq('id', id)
      .select('*, autor:created_by(id, nombre, email)')
      .single();
    if (error) throw error;
    return mapActividad(data);
  },

  async eliminar(id) {
    const { error } = await supabase.from('viaje_actividades').delete().eq('id', id);
    if (error) throw error;
  },
};

function mapActividad(row) {
  return {
    id: row.id,
    viajeId: row.viaje_id,
    fecha: row.fecha,
    hora: row.hora ? row.hora.slice(0, 5) : null,
    titulo: row.titulo,
    ubicacion: row.ubicacion,
    nota: row.nota,
    createdBy: row.created_by,
    autorNombre: row.autor?.nombre || row.autor?.email || '',
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 2: Manually verify against the DB**

With a trip and a valid `viajeId` at hand (from the Supabase dashboard), run a quick smoke check from a Node REPL or a temporary script using the same `supabase` client config, e.g. in `scratch/check_calendario.js`:

```js
const { viajeActividadesService } = require('../src/services/viajeActividadesService');
(async () => {
  const created = await viajeActividadesService.crear('<viajeId>', { fecha: '2026-08-01', hora: '10:30', titulo: 'Museo' });
  console.log('created', created);
  const list = await viajeActividadesService.getByViaje('<viajeId>');
  console.log('list', list);
  await viajeActividadesService.eliminar(created.id);
  console.log('deleted ok');
})();
```

Expected: `created` has `hora: '10:30'`, `list` includes it, and after `eliminar` a re-run of `getByViaje` no longer includes it. Delete `scratch/check_calendario.js` after verifying (it's a throwaway script, matching the existing `scratch/check_db.js` convention).

- [ ] **Step 3: Commit**

```bash
git add src/services/viajeActividadesService.js
git commit -m "feat: add viajeActividadesService for trip calendar activities"
```

---

## Task 6: Query + mutation hooks for activities

**Files:**
- Create: `src/hooks/queries/useViajeActividades.js`
- Create: `src/hooks/mutations/useViajeActividadMutations.js`

**Interfaces:**
- Consumes: `viajeActividadesService` (Task 5).
- Produces: `useViajeActividades(viajeId) => { actividades: Actividad[], loading: boolean }`; `useViajeActividadMutations(viajeId) => { crear, editar, eliminar }` (TanStack `useMutation` objects), query key `['viaje-actividades', viajeId]`. Consumed by Task 7's `ViajeCalendarioTab`.

- [ ] **Step 1: Create the query hook**

```js
// src/hooks/queries/useViajeActividades.js
import { useQuery } from '@tanstack/react-query';
import { viajeActividadesService } from '../../services/viajeActividadesService';

export function useViajeActividades(viajeId) {
  const query = useQuery({
    queryKey: ['viaje-actividades', viajeId],
    queryFn: () => viajeActividadesService.getByViaje(viajeId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!viajeId,
  });

  return { actividades: query.data ?? [], loading: query.isLoading };
}
```

- [ ] **Step 2: Create the mutations hook**

```js
// src/hooks/mutations/useViajeActividadMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { viajeActividadesService } from '../../services/viajeActividadesService';

export function useViajeActividadMutations(viajeId) {
  const queryClient = useQueryClient();
  const key = ['viaje-actividades', viajeId];

  const crear = useMutation({
    mutationFn: (campos) => viajeActividadesService.crear(viajeId, campos),
    onSuccess: (nueva) => {
      queryClient.setQueryData(key, (prev = []) => [...prev, nueva]);
    },
  });

  const editar = useMutation({
    mutationFn: ({ id, campos }) => viajeActividadesService.editar(id, campos),
    onSuccess: (actualizada) => {
      queryClient.setQueryData(key, (prev = []) => prev.map(a => a.id === actualizada.id ? actualizada : a));
    },
  });

  const eliminar = useMutation({
    mutationFn: (id) => viajeActividadesService.eliminar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old = []) => old.filter(a => a.id !== id));
      return { prev };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(key, ctx.prev);
    },
  });

  return { crear, editar, eliminar };
}
```

- [ ] **Step 3: Manually verify**

This hook pair has no standalone UI yet — verification happens together with Task 7 (the hooks are exercised there). Confirm both files have no syntax errors by running `node --check src/hooks/queries/useViajeActividades.js` — this will fail on the `import`/JSX-free ES module syntax under plain Node; if so, instead confirm via Metro bundler: run `expo start`, and confirm the bundler doesn't report a syntax/import error for these two new files in the terminal output (Task 7 will import and actually use them).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/queries/useViajeActividades.js src/hooks/mutations/useViajeActividadMutations.js
git commit -m "feat: add query/mutation hooks for viaje activities"
```

---

## Task 7: `ViajeCalendarioTab` + `AgregarActividadModal` wired into `ViajeDetailScreen`

**Files:**
- Create: `src/components/viajes/AgregarActividadModal.jsx`
- Create: `src/components/viajes/ViajeCalendarioTab.jsx`
- Modify: `src/screens/ViajeDetailScreen.jsx`

**Interfaces:**
- Consumes: `useViajeActividades`, `useViajeActividadMutations` (Task 6), `DateTimeField` (Task 3), `toISODate`/`parseISODate` (Task 1).
- Produces: `ViajeCalendarioTab({ viaje, dark })` rendered as the 4th tab in `ViajeDetailScreen`.

- [ ] **Step 1: Create `AgregarActividadModal.jsx`**

```jsx
// src/components/viajes/AgregarActividadModal.jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../../constants/theme';
import DateTimeField from '../common/DateTimeField';

function horaToDate(hora) {
  if (!hora) return null;
  const [h, m] = hora.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToHora(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function AgregarActividadModal({ visible, onClose, dark, actividad, onSave, onDelete }) {
  const insets = useSafeAreaInsets();
  const [titulo, setTitulo] = useState('');
  const [hora, setHora] = useState(null);
  const [ubicacion, setUbicacion] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = !!actividad;

  useEffect(() => {
    if (visible) {
      setTitulo(actividad?.titulo ?? '');
      setHora(horaToDate(actividad?.hora ?? null));
      setUbicacion(actividad?.ubicacion ?? '');
      setNota(actividad?.nota ?? '');
      setError('');
    }
  }, [visible, actividad]);

  const handleGuardar = async () => {
    if (!titulo.trim()) { setError('El título es requerido.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        titulo: titulo.trim(),
        hora: hora ? dateToHora(hora) : null,
        ubicacion: ubicacion.trim() || null,
        nota: nota.trim() || null,
      });
      onClose();
    } catch (err) {
      setError('Error al guardar la actividad: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = () => {
    Alert.alert('Eliminar actividad', '¿Eliminar esta actividad del itinerario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { onDelete(actividad.id); onClose(); } },
    ]);
  };

  const bg = dark ? colors.background.dark : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const inputBg = dark ? '#0F172A' : '#F8FAFC';
  const border = dark ? colors.border.dark : colors.border.light;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: textColor }]}>
              {isEditing ? 'Editar Actividad' : 'Nueva Actividad'}
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]}
              placeholder="Título (ej: Visita al museo)"
              placeholderTextColor={subtextColor}
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={[styles.label, { color: subtextColor }]}>
              HORA <Text style={{ textTransform: 'none', fontWeight: '400' }}>(opcional — sin hora queda como "todo el día")</Text>
            </Text>
            <View style={styles.horaRow}>
              <DateTimeField value={hora} onChange={setHora} dark={dark} mode="time" placeholder="Todo el día" style={{ flex: 1 }} />
              {hora && (
                <TouchableOpacity onPress={() => setHora(null)} style={styles.clearHoraBtn}>
                  <Text style={{ color: colors.error, fontSize: 13 }}>Quitar hora</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor }]}
              placeholder="Ubicación (opcional)"
              placeholderTextColor={subtextColor}
              value={ubicacion}
              onChangeText={setUbicacion}
            />

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textColor, minHeight: 70 }]}
              placeholder="Nota (opcional)"
              placeholderTextColor={subtextColor}
              value={nota}
              onChangeText={setNota}
              multiline
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={handleGuardar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isEditing ? 'Guardar cambios' : 'Agregar actividad'}</Text>}
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleEliminar}>
                <Text style={{ color: colors.error, fontWeight: '600' }}>Eliminar actividad</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: subtextColor }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md },
  handle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h2, marginBottom: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, ...typography.body, marginBottom: spacing.md },
  label: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  horaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  clearHoraBtn: { paddingHorizontal: spacing.sm, paddingVertical: 8 },
  error: { color: colors.error, fontSize: 13, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
```

- [ ] **Step 2: Create `ViajeCalendarioTab.jsx`**

```jsx
// src/components/viajes/ViajeCalendarioTab.jsx
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { toISODate, parseISODate } from '../../utils/formatters';
import { useViajeActividades } from '../../hooks/queries/useViajeActividades';
import { useViajeActividadMutations } from '../../hooks/mutations/useViajeActividadMutations';
import AgregarActividadModal from './AgregarActividadModal';
import EditarViajeModal from './EditarViajeModal';

function computeDias(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) return [];
  const start = parseISODate(fechaDesde);
  const end = parseISODate(fechaHasta);
  if (end < start) return [];
  const dias = [];
  const cursor = new Date(start);
  let n = 1;
  while (cursor <= end) {
    dias.push({
      n,
      iso: toISODate(cursor),
      label: `Día ${n}`,
      dateLabel: cursor.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
    });
    cursor.setDate(cursor.getDate() + 1);
    n++;
  }
  return dias;
}

function sortActividades(list) {
  return list.slice().sort((a, b) => {
    if (!a.hora && !b.hora) return 0;
    if (!a.hora) return 1;
    if (!b.hora) return -1;
    return a.hora.localeCompare(b.hora);
  });
}

export default function ViajeCalendarioTab({ viaje, dark }) {
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  const activo = viaje.estado === 'activo';
  const dias = useMemo(() => computeDias(viaje.fechaDesde, viaje.fechaHasta), [viaje.fechaDesde, viaje.fechaHasta]);
  const todayIso = toISODate(new Date());
  const [selectedIso, setSelectedIso] = useState(() => {
    if (dias.some(d => d.iso === todayIso)) return todayIso;
    return dias[0]?.iso ?? null;
  });
  const [showModal, setShowModal] = useState(false);
  const [showEditarViaje, setShowEditarViaje] = useState(false);
  const [editingActividad, setEditingActividad] = useState(null);

  const { actividades, loading } = useViajeActividades(viaje.id);
  const { crear, editar, eliminar } = useViajeActividadMutations(viaje.id);

  const actividadesDelDia = sortActividades(actividades.filter(a => a.fecha === selectedIso));

  const abrirNueva = () => { setEditingActividad(null); setShowModal(true); };
  const abrirEditar = (act) => { setEditingActividad(act); setShowModal(true); };

  const handleSave = async (campos) => {
    if (editingActividad) {
      await editar.mutateAsync({ id: editingActividad.id, campos });
    } else {
      await crear.mutateAsync({ fecha: selectedIso, ...campos });
    }
  };

  const handleDelete = (id) => {
    eliminar.mutate(id, { onError: (err) => Alert.alert('Error', err.message) });
  };

  if (dias.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: bg }]}>
        <Ionicons name="calendar-outline" size={40} color={subtextColor} />
        <Text style={[styles.emptyTitle, { color: textColor }]}>Este viaje no tiene fechas cargadas</Text>
        <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
          Cargá las fechas del viaje para armar el itinerario día por día.
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowEditarViaje(true)}>
          <Text style={styles.emptyBtnText}>Cargar fechas</Text>
        </TouchableOpacity>
        <EditarViajeModal
          visible={showEditarViaje}
          onClose={() => setShowEditarViaje(false)}
          viaje={viaje}
          dark={dark}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diasStrip} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
        {dias.map(dia => {
          const active = dia.iso === selectedIso;
          return (
            <TouchableOpacity
              key={dia.iso}
              style={[styles.diaChip, { backgroundColor: active ? colors.primary : surfaceBg }]}
              onPress={() => setSelectedIso(dia.iso)}
              activeOpacity={0.7}
            >
              <Text style={[styles.diaChipLabel, { color: active ? '#fff' : textColor }]}>{dia.label}</Text>
              <Text style={[styles.diaChipDate, { color: active ? 'rgba(255,255,255,0.8)' : subtextColor }]}>{dia.dateLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: subtextColor }]}>ITINERARIO</Text>
        {activo && (
          <TouchableOpacity onPress={abrirNueva}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: 0, paddingBottom: 40 }}>
          {actividadesDelDia.length === 0 && (
            <Text style={[styles.emptyDia, { color: subtextColor }]}>Sin actividades para este día</Text>
          )}
          {actividadesDelDia.map(act => (
            <TouchableOpacity
              key={act.id}
              style={[styles.actCard, { backgroundColor: surfaceBg }]}
              onPress={() => activo && abrirEditar(act)}
              activeOpacity={activo ? 0.7 : 1}
            >
              <View style={styles.actHoraBox}>
                <Text style={styles.actHoraText}>{act.hora || 'Todo el día'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actTitulo, { color: textColor }]}>{act.titulo}</Text>
                {!!act.ubicacion && (
                  <View style={styles.actUbicacionRow}>
                    <Ionicons name="location-outline" size={12} color={subtextColor} />
                    <Text style={[styles.actUbicacion, { color: subtextColor }]}>{act.ubicacion}</Text>
                  </View>
                )}
                {!!act.nota && <Text style={[styles.actNota, { color: subtextColor }]}>{act.nota}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <AgregarActividadModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        dark={dark}
        actividad={editingActividad}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyTitle: { ...typography.h3, marginTop: spacing.md, textAlign: 'center' },
  emptySubtitle: { ...typography.body, marginTop: spacing.xs, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, marginTop: spacing.md },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
  diasStrip: { flexGrow: 0, paddingVertical: spacing.md },
  diaChip: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, alignItems: 'center' },
  diaChipLabel: { fontSize: 13, fontWeight: '700' },
  diaChipDate: { fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  sectionLabel: { ...typography.captionMed, textTransform: 'uppercase', letterSpacing: 0.8 },
  emptyDia: { ...typography.body, textAlign: 'center', paddingVertical: spacing.md },
  actCard: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  actHoraBox: { minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  actHoraText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  actTitulo: { ...typography.bodyMed },
  actUbicacionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  actUbicacion: { fontSize: 12 },
  actNota: { fontSize: 12, marginTop: 4 },
});
```

- [ ] **Step 3: Wire the tab into `ViajeDetailScreen.jsx`**

In `src/screens/ViajeDetailScreen.jsx`, add the import after line 15:

```jsx
import ViajeCalendarioTab from '../components/viajes/ViajeCalendarioTab';
```

Change line 18:

```jsx
const TABS = ['💸 Gastos', '⚖️ Balance', '✅ Notas', '📅 Calendario'];
```

Add the render block after the `ViajeNotasTab` block (after line 197, before `<ViajeOpcionesSheet`):

```jsx
      {tabIdx === 3 && (
        <ViajeCalendarioTab
          viaje={viaje}
          dark={dark}
        />
      )}
```

- [ ] **Step 4: Manually verify**

Run `expo start`, open a trip with `fecha_desde`/`fecha_hasta` set (from Task 3/4's verification), tap the "📅 Calendario" tab. Confirm: the day strip shows one chip per day of the trip with correct dates; tapping a chip switches the agenda list; tapping "+" opens the add-activity modal; adding an activity with a título and hora shows it in the agenda sorted correctly among other same-day activities; adding one without an hora shows "Todo el día" and sorts last; tapping an existing activity opens it pre-filled for editing; deleting via the modal's "Eliminar actividad" (with confirm dialog) removes it from the list. Also open a trip with no dates set — confirm the empty state with "Cargar fechas" appears and opens `EditarViajeModal`.

- [ ] **Step 5: Commit**

```bash
git add src/components/viajes/AgregarActividadModal.jsx src/components/viajes/ViajeCalendarioTab.jsx src/screens/ViajeDetailScreen.jsx
git commit -m "feat: add Calendario tab with day-strip itinerary to viaje detail"
```

---

## Task 8: Daily summary push notification (server-side cron + Edge Function)

**Files:**
- Create: `supabase/functions/send-daily-viaje-summary/index.ts`
- Create: `supabase/migrations/20260722_viaje_calendario_cron.sql`

**Interfaces:**
- Consumes: `public.viajes` (`estado`, `fecha_desde`, `fecha_hasta`, `titulo`, `emoji`), `public.viaje_actividades` (`fecha`, `hora`, `titulo`), `public.viaje_participantes`, `public.profiles.fcm_token` — all from Task 1 and existing schema. Reuses the FCM v1 send pattern from `supabase/functions/send-push-notification/index.ts`.
- Produces: a scheduled job that, once deployed and the SQL is applied, POSTs to the new Edge Function every day at 08:00 `America/Argentina/Buenos_Aires`, sending one push per participant per trip with activities that day.

- [ ] **Step 1: Create the Edge Function**

```ts
// supabase/functions/send-daily-viaje-summary/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FCM_PROJECT_ID = 'mybolucompras'
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const TRIP_TIMEZONE = 'America/Argentina/Buenos_Aires'

function base64url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))
  const signingInput = `${header}.${claims}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput))
  const jwt = `${signingInput}.${base64url(new Uint8Array(signatureBuffer))}`
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const json = await res.json()
  if (!json.access_token) throw new Error(`Token exchange failed: ${JSON.stringify(json)}`)
  return json.access_token
}

async function sendFcm(accessToken: string, token: string, title: string, body: string, data: Record<string, string>) {
  const fcmPayload = {
    message: {
      token,
      notification: { title, body },
      android: {
        priority: 'HIGH',
        notification: {
          channel_id: 'default',
          color: '#6366F1',
          sound: 'default',
          notification_priority: 'PRIORITY_HIGH',
          default_vibrate_timings: true,
        },
      },
      data,
    },
  }
  const res = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(fcmPayload),
  })
  const result = await res.json()
  if (!res.ok) console.error('[FCM] Error sending to token:', JSON.stringify(result))
}

function todayInTimezone(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TRIP_TIMEZONE }).format(new Date())
}

function buildResumen(actividades: { hora: string | null; titulo: string }[]): string {
  const items = actividades.map(a => a.hora ? `${a.hora.slice(0, 5)} ${a.titulo}` : a.titulo)
  const shown = items.slice(0, 3)
  const rest = items.length - shown.length
  return rest > 0 ? `${shown.join(', ')} y ${rest} más` : shown.join(', ')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT secret not configured')
  const sa = JSON.parse(raw)
  const accessToken = await getAccessToken(sa.client_email, sa.private_key)

  const today = todayInTimezone()

  const { data: viajes, error: viajesError } = await supabase
    .from('viajes')
    .select('id, titulo, emoji')
    .eq('estado', 'activo')
    .lte('fecha_desde', today)
    .gte('fecha_hasta', today)

  if (viajesError) {
    console.error('[DailySummary] Error fetching viajes:', viajesError.message)
    return new Response(JSON.stringify({ error: viajesError.message }), { status: 500 })
  }

  let sentCount = 0

  for (const viaje of viajes ?? []) {
    try {
      const { data: actividades, error: actError } = await supabase
        .from('viaje_actividades')
        .select('hora, titulo')
        .eq('viaje_id', viaje.id)
        .eq('fecha', today)
        .order('hora', { ascending: true, nullsFirst: false })

      if (actError) throw actError
      if (!actividades || actividades.length === 0) continue

      const { data: participantes, error: partError } = await supabase
        .from('viaje_participantes')
        .select('user_id')
        .eq('viaje_id', viaje.id)

      if (partError) throw partError
      const userIds = (participantes ?? []).map(p => p.user_id)
      if (userIds.length === 0) continue

      const { data: perfiles, error: perfilesError } = await supabase
        .from('profiles')
        .select('id, fcm_token')
        .in('id', userIds)
        .not('fcm_token', 'is', null)

      if (perfilesError) throw perfilesError

      const title = `📅 ${viaje.emoji} ${viaje.titulo} — Hoy`
      const body = buildResumen(actividades)

      for (const perfil of perfiles ?? []) {
        await sendFcm(accessToken, perfil.fcm_token, title, body, {
          type: 'viaje_resumen_dia',
          viajeId: viaje.id,
        })
        sentCount++
      }
    } catch (err) {
      console.error(`[DailySummary] Error processing viaje ${viaje.id}:`, err?.message ?? err)
    }
  }

  return new Response(JSON.stringify({ success: true, viajesProcesados: (viajes ?? []).length, notificacionesEnviadas: sentCount }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Create the cron migration SQL**

```sql
-- supabase/migrations/20260722_viaje_calendario_cron.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: the `send-daily-viaje-summary` Edge Function must already be deployed
-- (supabase functions deploy send-daily-viaje-summary), and its CRON_SECRET /
-- GOOGLE_SERVICE_ACCOUNT / SUPABASE_SERVICE_ROLE_KEY secrets must already be set
-- (supabase secrets set CRON_SECRET=<your-generated-secret>).
--
-- Before running, replace the two placeholders below:
--   <PROJECT_REF>   — your Supabase project ref (from the project URL / dashboard settings)
--   <CRON_SECRET>   — the exact same value you set via `supabase secrets set CRON_SECRET=...`

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'viaje-daily-summary',
  '0 11 * * *', -- 11:00 UTC = 08:00 America/Argentina/Buenos_Aires (fixed UTC-3, no DST)
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-viaje-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 3: Manually deploy and verify**

Run:

```bash
supabase functions deploy send-daily-viaje-summary
supabase secrets set CRON_SECRET=<a-long-random-value-you-generate>
```

(`GOOGLE_SERVICE_ACCOUNT` should already be set from the existing `send-push-notification` function; `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are provided automatically to every Edge Function by the platform.)

Then, with a trip that has `fecha_desde <= today <= fecha_hasta` and at least one `viaje_actividades` row for today (create one via the app's Calendario tab from Task 7), manually invoke the function to verify end-to-end before relying on the cron:

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-viaje-summary \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Expected: JSON response `{"success":true,"viajesProcesados":<N>,"notificacionesEnviadas":<M>}` with `M >= 1`, and a push notification arrives on a participant's physical device (same manual check already used for `send-push-notification`). Finally, apply the Step 2 SQL (with real `<PROJECT_REF>`/`<CRON_SECRET>` substituted) in the dashboard SQL Editor, and confirm the job was registered:

```sql
select * from cron.job where jobname = 'viaje-daily-summary';
```

Expected: one row, `schedule = '0 11 * * *'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-daily-viaje-summary/index.ts supabase/migrations/20260722_viaje_calendario_cron.sql
git commit -m "feat: add daily viaje summary push notification via pg_cron + edge function"
```
