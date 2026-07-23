# Modo Viaje — Redirección Automática — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the app opens on or after a trip's `fecha_desde`, prompt the user to activate "Modo Viaje" for that trip; while active, app launch redirects straight to that trip's detail screen instead of landing on the default tabs.

**Architecture:** Three new persisted fields on `configuracion_usuario` (mirrored through `configuracionService`/`useConfiguracion`), a new `ModoViajeChecker` component mounted next to the existing `CierreChecker` that runs the auto-deactivate/prompt/redirect logic in one effect, a new `ModoViajeModal` for the opt-in prompt, a module-level shared `navigationRef` so the checker (rendered outside the nested `AuthStack.Navigator`) can navigate into `ViajeDetail`, and a manual off-switch in `ConfiguracionScreen`.

**Tech Stack:** React Native, Expo, React Navigation (nested stack/tab navigators), TanStack Query (`useQuery`/`useMutation`), Supabase (Postgres + RLS), no automated test suite (established project convention — verification is manual).

## Global Constraints

- Design source of truth: `docs/superpowers/specs/2026-07-23-modo-viaje-redirect-design.md` — every task below implements one numbered section of that spec.
- No automated test framework exists in this repo. Every task ends with a manual verification step instead of a test run — this matches how `CierreChecker`/`ActualizarCierreModal` were built.
- Follow existing code style exactly: 2-space indent, no semicolon omissions, `dark ? colors.x.dark : colors.x.light` theming pattern, Spanish user-facing copy.
- Supabase migrations in this repo are **not** auto-applied — they are SQL files the user runs manually in the Supabase dashboard SQL Editor (see any file under `supabase/migrations/`). The migration task produces the file only; running it against the live database is the user's action, not this plan's.
- `viajes.fecha_desde` / `viajes.fecha_hasta` already exist as nullable `date` columns (added in `supabase/migrations/20260722_viaje_calendario.sql`) and are exposed on the mapped viaje object as `fechaDesde`/`fechaHasta` (ISO `YYYY-MM-DD` strings or `null`) by `viajesService.js`'s `mapViaje`. Do not re-add these columns.

---

## Task 1: Database migration — `configuracion_usuario` columns

**Files:**
- Create: `supabase/migrations/20260723_modo_viaje_redirect.sql`

**Interfaces:**
- Produces: three new columns consumed by Task 2 — `modo_viaje_activo boolean`, `modo_viaje_viaje_id uuid`, `modo_viaje_prompted_ids uuid[]`.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260723_modo_viaje_redirect.sql
-- NOTE: This migration must be run manually in the Supabase dashboard SQL Editor.
-- It will NOT be run automatically by this code — copy-paste the entire content below
-- into your Supabase project's SQL Editor and execute it.
--
-- PREREQUISITE: public.configuracion_usuario and public.viajes must already exist.

ALTER TABLE public.configuracion_usuario
  ADD COLUMN IF NOT EXISTS modo_viaje_activo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modo_viaje_viaje_id uuid NULL REFERENCES public.viajes(id),
  ADD COLUMN IF NOT EXISTS modo_viaje_prompted_ids uuid[] NOT NULL DEFAULT '{}';
```

- [ ] **Step 2: Manual verification**

Open the file and confirm the three `ADD COLUMN IF NOT EXISTS` lines match the column names/types above exactly (they're referenced by exact name in Task 2). No DB connection needed for this step — the SQL isn't run until the user applies it manually.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260723_modo_viaje_redirect.sql
git commit -m "feat: add modo viaje columns to configuracion_usuario migration"
```

---

## Task 2: `configuracionService` + `useConfiguracion` field wiring

**Files:**
- Modify: `src/services/configuracionService.js`
- Modify: `src/hooks/queries/useConfiguracion.js`

**Interfaces:**
- Consumes: nothing new (column names from Task 1, informational only — this task doesn't run SQL).
- Produces: `mydata.modoViajeActivo` (boolean), `mydata.modoViajeViajeId` (string uuid or `null`), `mydata.modoViajePromptedIds` (array of uuid strings) — available everywhere `useConfiguracion()` is called. Consumed by Tasks 4, 5, 6.

- [ ] **Step 1: Edit `getDefaults()` in `configuracionService.js`**

In `src/services/configuracionService.js:28-36`, add the three fields to the returned object:

```js
function getDefaults() {
  return {
    cierre: '', vencimiento: '',
    cierreAnterior: '', vencimientoAnterior: '',
    fondos: 0, etiquetas: [], presupuestos: {},
    presupuestoMensualMax: 0, bancosHabilitados: [],
    mediosHabilitados: [], monedaPreferida: 'ARS',
    modoViajeActivo: false, modoViajeViajeId: null, modoViajePromptedIds: [],
  };
}
```

- [ ] **Step 2: Edit `mapFromDB()` in `configuracionService.js`**

In `src/services/configuracionService.js:38-52`, add three lines before the closing `};`:

```js
function mapFromDB(row) {
  return {
    cierre: row.cierre || '',
    vencimiento: row.vencimiento || '',
    cierreAnterior: row.cierre_anterior || '',
    vencimientoAnterior: row.vencimiento_anterior || '',
    fondos: Number(row.fondos) || 0,
    etiquetas: (row.etiquetas || []).map(e => typeof e === 'string' ? { nombre: e, color: '#6366F1' } : e).filter(e => e?.nombre),
    presupuestos: row.presupuestos || {},
    presupuestoMensualMax: Number(row.presupuesto_mensual_max) || 0,
    bancosHabilitados: row.bancos_habilitados || [],
    mediosHabilitados: row.medios_habilitados || [],
    monedaPreferida: row.moneda_preferida || 'ARS',
    modoViajeActivo: row.modo_viaje_activo ?? false,
    modoViajeViajeId: row.modo_viaje_viaje_id ?? null,
    modoViajePromptedIds: row.modo_viaje_prompted_ids ?? [],
  };
}
```

- [ ] **Step 3: Edit `mapToDB()` in `configuracionService.js`**

In `src/services/configuracionService.js:54-68`, add three lines before the closing `};`:

```js
function mapToDB(config) {
  return {
    cierre: config.cierre || null,
    vencimiento: config.vencimiento || null,
    cierre_anterior: config.cierreAnterior || null,
    vencimiento_anterior: config.vencimientoAnterior || null,
    fondos: Number(config.fondos) || 0,
    etiquetas: config.etiquetas || [],
    presupuestos: config.presupuestos || {},
    presupuesto_mensual_max: Number(config.presupuestoMensualMax) || 0,
    bancos_habilitados: config.bancosHabilitados || [],
    medios_habilitados: config.mediosHabilitados || [],
    moneda_preferida: config.monedaPreferida || 'ARS',
    modo_viaje_activo: !!config.modoViajeActivo,
    modo_viaje_viaje_id: config.modoViajeViajeId ?? null,
    modo_viaje_prompted_ids: config.modoViajePromptedIds ?? [],
  };
}
```

- [ ] **Step 4: Edit `defaultMydata` in `useConfiguracion.js`**

In `src/hooks/queries/useConfiguracion.js:5-11`:

```js
const defaultMydata = {
  cierre: '', vencimiento: '',
  cierreAnterior: '', vencimientoAnterior: '',
  fondos: 0, etiquetas: [], presupuestos: {},
  presupuestoMensualMax: 0, bancosHabilitados: [],
  mediosHabilitados: [], monedaPreferida: 'ARS',
  modoViajeActivo: false, modoViajeViajeId: null, modoViajePromptedIds: [],
};
```

- [ ] **Step 5: Manual verification**

Run `npx eslint src/services/configuracionService.js src/hooks/queries/useConfiguracion.js` (or open both files) and confirm no syntax errors — three fields appear in all four objects (`getDefaults`, `mapFromDB`, `mapToDB`, `defaultMydata`) with matching names. This can't be runtime-verified without the DB migration applied; static review is sufficient for this task.

- [ ] **Step 6: Commit**

```bash
git add src/services/configuracionService.js src/hooks/queries/useConfiguracion.js
git commit -m "feat: wire modo viaje fields through configuracionService and useConfiguracion"
```

---

## Task 3: Shared navigation ref

**Files:**
- Create: `src/navigation/navigationRef.js`
- Modify: `App.js`

**Interfaces:**
- Produces: `navigationRef` (a `NavigationContainerRef` from `createNavigationContainerRef()`) and `navigate(name, params)` — both exported from `src/navigation/navigationRef.js`. Consumed by Task 5 (`ModoViajeChecker`) and Task 4 (`ModoViajeModal`).

- [ ] **Step 1: Create `src/navigation/navigationRef.js`**

```js
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
```

- [ ] **Step 2: Update `App.js` imports**

In `App.js:5`, remove `useNavigationContainerRef` from the react-navigation import (it becomes unused) and add the new shared-ref import near the other local imports:

```js
import { NavigationContainer } from '@react-navigation/native';
```

Add after `App.js:16` (`import { useRealtimeInvalidation } ...`):

```js
import { navigationRef } from './src/navigation/navigationRef';
```

- [ ] **Step 3: Update `AppWithTheme` in `App.js`**

In `App.js:230-256`, remove the local ref creation and rely on the imported one:

```js
function AppWithTheme() {
  const { dark } = useTheme();
  const responseListener = useRef();

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (!navigationRef.isReady()) return;
      if (data?.screen === 'Gastos') {
        navigationRef.navigate('Gastos');
      } else if (data?.screen === 'Deudores') {
        navigationRef.navigate('Deudores');
      }
    });
    return () => {
      responseListener.current?.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}
```

- [ ] **Step 4: Manual verification**

Run `npx expo start` (or the project's usual dev-server command), open the app on a simulator/device, and confirm it boots to the login/tabs screen with no red-box errors (this exercises `NavigationContainer ref={navigationRef}` end to end). Tap a push notification if one is available to confirm the notification-tap navigation still works — otherwise this is covered indirectly by Task 5's redirect test.

- [ ] **Step 5: Commit**

```bash
git add src/navigation/navigationRef.js App.js
git commit -m "feat: extract shared navigationRef so components outside AuthStack can navigate"
```

---

## Task 4: `ModoViajeModal` component

**Files:**
- Create: `src/components/ModoViajeModal.jsx`

**Interfaces:**
- Consumes: `useConfiguracion()` → `mydata.modoViajePromptedIds`; `useConfiguracionMutations()` → `actualizar.mutateAsync`; `navigate` from `src/navigation/navigationRef.js` (Task 3).
- Produces: `ModoViajeModal({ visible, viaje, onClose })` where `viaje` is `{ id, titulo, emoji }` (subset of the mapped viaje object from `viajesService.js`). Consumed by Task 5 (`ModoViajeChecker`).

- [ ] **Step 1: Write `src/components/ModoViajeModal.jsx`**

```jsx
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useConfiguracionMutations } from '../hooks/mutations/useConfiguracionMutations';
import { navigate } from '../navigation/navigationRef';
import { colors, spacing, radius, typography } from '../constants/theme';

export default function ModoViajeModal({ visible, viaje, onClose }) {
  const { dark } = useTheme();
  const { mydata } = useConfiguracion();
  const { actualizar } = useConfiguracionMutations();
  const s = styles(dark);

  const [activar, setActivar] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!viaje) return null;

  const handleConfirmar = async (overrideActivar) => {
    const activarFlag = overrideActivar !== undefined ? overrideActivar : activar;
    setLoading(true);
    try {
      const promptedIds = [...new Set([...(mydata.modoViajePromptedIds || []), viaje.id])];
      await actualizar.mutateAsync({
        ...mydata,
        modoViajePromptedIds: promptedIds,
        ...(activarFlag ? { modoViajeActivo: true, modoViajeViajeId: viaje.id } : {}),
      });
      if (activarFlag) {
        navigate('ViajeDetail', { viajeId: viaje.id });
      }
    } catch {
      // silently ignore — mutation already handles optimistic rollback
    } finally {
      setLoading(false);
      setActivar(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => handleConfirmar(false)}
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.iconCircle}>
            <Ionicons name="airplane-outline" size={38} color={colors.primary} />
          </View>

          <Text style={s.title}>¿Activar Modo Viaje?</Text>
          <Text style={s.message}>
            {viaje.emoji} {viaje.titulo} ya empezó. Con Modo Viaje activado, la app te va a llevar directo a este viaje al abrirla.
          </Text>

          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Activar Modo Viaje</Text>
            <Switch
              value={activar}
              onValueChange={setActivar}
              disabled={loading}
              trackColor={{ false: dark ? '#334155' : '#CBD5E1', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => handleConfirmar()}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.primaryBtnText}>Confirmar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = (dark) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: dark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderRadius: 20,
    padding: spacing.lg + 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: dark ? 0.5 : 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}18`,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: dark ? colors.text.dark : colors.text.light,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: dark ? '#1e293b' : '#F8FAFC',
    marginBottom: spacing.lg,
  },
  switchLabel: {
    ...typography.bodyMed,
    color: dark ? colors.text.dark : colors.text.light,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  primaryBtnText: {
    ...typography.bodyMed,
    color: '#fff',
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Manual verification**

This component isn't reachable in the UI until Task 5 mounts `ModoViajeChecker`, so verification happens at the end of Task 5. For now, run `npx eslint src/components/ModoViajeModal.jsx` and confirm no syntax/import errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ModoViajeModal.jsx
git commit -m "feat: add ModoViajeModal opt-in prompt component"
```

---

## Task 5: `ModoViajeChecker` component + mount in `App.js`

**Files:**
- Create: `src/components/ModoViajeChecker.jsx`
- Modify: `App.js`

**Interfaces:**
- Consumes: `useConfiguracion()` (Task 2), `useConfiguracionMutations()`, `useViajes()` → `viajesActivos` (each viaje has `id`, `titulo`, `emoji`, `fechaDesde`, `fechaHasta` per `viajesService.js`'s `mapViaje`), `toISODate`/`parseISODate` from `src/utils/formatters.js`, `navigate` from `src/navigation/navigationRef.js` (Task 3), `ModoViajeModal` (Task 4).
- Produces: `<ModoViajeChecker />`, mounted as a sibling of `<CierreChecker />` in `App.js`.

- [ ] **Step 1: Write `src/components/ModoViajeChecker.jsx`**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useConfiguracionMutations } from '../hooks/mutations/useConfiguracionMutations';
import { useViajes } from '../hooks/queries/useViajes';
import { navigate } from '../navigation/navigationRef';
import { toISODate, parseISODate } from '../utils/formatters';
import ModoViajeModal from './ModoViajeModal';

export default function ModoViajeChecker() {
  const { mydata } = useConfiguracion();
  const { actualizar } = useConfiguracionMutations();
  const { viajesActivos } = useViajes();
  const [candidato, setCandidato] = useState(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!mydata) return;

    const today = toISODate(new Date());
    const todayDate = parseISODate(today);

    if (mydata.modoViajeActivo) {
      const viaje = viajesActivos.find(v => v.id === mydata.modoViajeViajeId);
      let vencido = false;
      if (viaje?.fechaHasta) {
        const limite = parseISODate(viaje.fechaHasta);
        limite.setDate(limite.getDate() + 1);
        vencido = todayDate > limite;
      }

      if (!viaje || vencido) {
        actualizar.mutateAsync({ ...mydata, modoViajeActivo: false, modoViajeViajeId: null });
        return;
      }

      if (mydata.modoViajeViajeId && !redirectedRef.current) {
        redirectedRef.current = true;
        navigate('ViajeDetail', { viajeId: mydata.modoViajeViajeId });
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
      setCandidato(elegido);
    }
  }, [mydata, viajesActivos]);

  return (
    <ModoViajeModal
      visible={!!candidato}
      viaje={candidato}
      onClose={() => setCandidato(null)}
    />
  );
}
```

- [ ] **Step 2: Mount `ModoViajeChecker` in `App.js`**

In `App.js`, add the import near `CierreChecker`'s (currently `App.js:38`):

```js
import CierreChecker from './src/components/CierreChecker';
import ModoViajeChecker from './src/components/ModoViajeChecker';
```

Then in `RootNavigator`'s `Main` screen render (`App.js:141`), add it right after `<CierreChecker />`:

```jsx
            <DataProvider>
              <CierreChecker />
              <ModoViajeChecker />
              <ViajesProvider>
```

- [ ] **Step 3: Manual verification**

Follow the spec's testing checklist end to end against a real Supabase project (after Task 1's migration has been applied there):
1. Create a trip with `fecha_desde` = today (via the Viajes UI, or `viajesService.crear` with a today `fechaDesde`).
2. Reopen the app — confirm `ModoViajeModal` appears with the correct trip emoji/titulo in the message.
3. Toggle the switch on and tap "Confirmar" — confirm the app navigates to that trip's `ViajeDetailScreen`.
4. Force-close and reopen the app — confirm it lands directly on that trip's detail screen (not the Gastos tab).
5. Reopen again — confirm the same trip does not re-prompt.
6. From Settings (once Task 6 is done) turn Modo Viaje off — confirm the next app open lands on Gastos again.
7. Set that trip's `fecha_hasta` to 2+ days in the past while Modo Viaje is active for it (e.g. via `viajesService.editarViaje`), reopen the app — confirm it silently deactivates with no modal and lands on Gastos.

- [ ] **Step 4: Commit**

```bash
git add src/components/ModoViajeChecker.jsx App.js
git commit -m "feat: add ModoViajeChecker for auto-deactivate/prompt/redirect on app launch"
```

---

## Task 6: Settings toggle in `ConfiguracionScreen`

**Files:**
- Modify: `src/screens/ConfiguracionScreen.jsx`

**Interfaces:**
- Consumes: `useConfiguracion()` → `mydata.modoViajeActivo`/`modoViajeViajeId` (Task 2), `useConfiguracionMutations()` → `actualizar.mutateAsync`, `useViajes()` → `viajesActivos`, `toISODate` from `src/utils/formatters.js`.

- [ ] **Step 1: Add `useViajes` and `toISODate` imports**

In `src/screens/ConfiguracionScreen.jsx:11-16`, add two imports:

```js
import { useConfiguracion } from '../hooks/queries/useConfiguracion';
import { useConfiguracionMutations } from '../hooks/mutations/useConfiguracionMutations';
import { useViajes } from '../hooks/queries/useViajes';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { formatARS, toISODate } from '../utils/formatters';
import { BANCOS, MEDIOS_DE_PAGO, MONEDAS, ETIQUETA_COLORS } from '../constants/catalogos';
```

- [ ] **Step 2: Compute Modo Viaje display state**

In `src/screens/ConfiguracionScreen.jsx:51-57`, right after the existing hook calls, add:

```js
export default function ConfiguracionScreen() {
  const { user, signOut, biometricEnabled, biometricAvailable, enableBiometric } = useAuth();
  const { mydata } = useConfiguracion();
  const { actualizar } = useConfiguracionMutations();
  const { viajesActivos } = useViajes();
  const { dark, mode, setTheme } = useTheme();
  const s = styles(dark);
  const { showModal, modal } = useModal();

  const today = toISODate(new Date());
  const viajeModoActivo = mydata.modoViajeActivo
    ? viajesActivos.find(v => v.id === mydata.modoViajeViajeId)
    : null;
  const viajeEnCurso = viajesActivos.find(
    v => v.fechaDesde && v.fechaHasta && v.fechaDesde <= today && today <= v.fechaHasta
  );
  const modoViajeSubtitle = viajeModoActivo
    ? `Activo: ${viajeModoActivo.emoji} ${viajeModoActivo.titulo}`
    : viajeEnCurso
      ? 'Se activa desde el aviso al abrir la app'
      : 'No hay ningún viaje en curso';

  const handleToggleModoViaje = async () => {
    await actualizar.mutateAsync({ ...mydata, modoViajeActivo: false, modoViajeViajeId: null });
  };
```

- [ ] **Step 3: Add the row to the "Seguridad" section**

In `src/screens/ConfiguracionScreen.jsx:479-502`, add the new row after the existing `bioRow` block, inside the same `s.card`:

```jsx
        {/* Seguridad */}
        <AccordionSection title="Seguridad" dark={dark}>
          <View style={s.card}>
            <View style={s.bioRow}>
              <View style={s.bioInfo}>
                <Ionicons name="finger-print" size={22} color={biometricEnabled ? colors.primary : (dark ? '#475569' : '#94A3B8')} />
                <View style={{ flex: 1 }}>
                  <Text style={s.bioTitle}>Huella / Face ID</Text>
                  <Text style={s.bioSub}>
                    {biometricAvailable
                      ? 'Desbloquear la app con biometría'
                      : 'No disponible en este dispositivo'}
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={biometricAvailable ? enableBiometric : undefined}
                disabled={!biometricAvailable}
                trackColor={{ false: dark ? '#334155' : '#CBD5E1', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={[s.bioRow, { marginTop: spacing.md }]}>
              <View style={s.bioInfo}>
                <Ionicons name="airplane-outline" size={22} color={mydata.modoViajeActivo ? colors.primary : (dark ? '#475569' : '#94A3B8')} />
                <View style={{ flex: 1 }}>
                  <Text style={s.bioTitle}>Modo Viaje</Text>
                  <Text style={s.bioSub}>{modoViajeSubtitle}</Text>
                </View>
              </View>
              <Switch
                value={mydata.modoViajeActivo}
                onValueChange={mydata.modoViajeActivo ? handleToggleModoViaje : undefined}
                disabled={!mydata.modoViajeActivo}
                trackColor={{ false: dark ? '#334155' : '#CBD5E1', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </AccordionSection>
```

- [ ] **Step 4: Manual verification**

With Modo Viaje active for a trip (from Task 5's verification), open Settings → Seguridad, confirm the row shows "Activo: {emoji} {titulo}" with a colored airplane icon and an enabled switch; toggle it off and confirm `mydata.modoViajeActivo` flips to `false` (the row's subtitle and icon color update, and reopening the app now lands on Gastos). With no trip in range and Modo Viaje off, confirm the row shows "No hay ningún viaje en curso" with a disabled, off switch.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ConfiguracionScreen.jsx
git commit -m "feat: add Modo Viaje off-switch to Settings"
```

---

## Self-Review Notes

- **Spec coverage:** §1 (data) → Tasks 1–2. §2 (`ModoViajeChecker`) → Task 5. §3 (shared nav ref) → Task 3. §4 (`ModoViajeModal`) → Task 4. §5 (Settings toggle) → Task 6. Error handling bullets are folded into Tasks 4–5's implementations (swallowed mutation errors, `navigationRef.isReady()` guard, missing-trip treated as expired). Testing section → each task's manual verification step, consolidated end-to-end check in Task 5 Step 3.
- **Type consistency:** `viaje.fechaDesde`/`fechaHasta` (camelCase, ISO date strings) used consistently across Tasks 5–6, matching `viajesService.js`'s `mapViaje` output. `mydata.modoViajeActivo`/`modoViajeViajeId`/`modoViajePromptedIds` used consistently across Tasks 2, 4, 5, 6.
