# Viaje Deudas y Pagos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando se agrega un gasto de viaje con split, crear automáticamente deudas individuales en `deudores`, permitir marcarlas como pagadas con swipe, y registrar los pagos en una nueva pestaña del viaje.

**Architecture:** Se agrega `viaje_id` (nullable) a la tabla `deudores` y se crea la tabla `viaje_pagos`. Al guardar un gasto de viaje, `viajeGastosService` inserta deudores directamente en Supabase (sin pasar por `deudoresService.crear()` para evitar side-effects). Al marcar una deuda como pagada, si tiene `viaje_id`, `deudoresService` inserta en `viaje_pagos`. El viaje muestra una nueva pestaña "💳 Pagos" con el historial.

**Tech Stack:** React Native, Expo, Supabase (PostgreSQL + realtime), @supabase/supabase-js

---

## Archivos

| Acción | Archivo |
|--------|---------|
| Schema manual | Supabase SQL Editor (2 migraciones) |
| Modificar | `src/services/deudoresService.js` |
| Crear | `src/services/viajePagosService.js` |
| Modificar | `src/services/viajeGastosService.js` |
| Modificar | `src/components/DeudaCard.jsx` |
| Modificar | `src/screens/ViajeDetailScreen.jsx` |
| Crear | `src/components/viajes/ViajesPagosTab.jsx` |

---

### Task 1: Schema — migraciones en Supabase

No genera código en el repo. Ejecutar manualmente en Supabase > SQL Editor.

**Files:**
- No file changes — manual SQL execution required

- [ ] **Step 1: Ejecutar migración 1 — columna `viaje_id` en `deudores`**

En Supabase Dashboard → SQL Editor, ejecutar:

```sql
ALTER TABLE deudores
  ADD COLUMN IF NOT EXISTS viaje_id UUID REFERENCES viajes(id) ON DELETE SET NULL;
```

Verificar: ir a Table Editor → `deudores` → confirmar que la columna `viaje_id` aparece.

- [ ] **Step 2: Ejecutar migración 2 — tabla `viaje_pagos`**

```sql
CREATE TABLE IF NOT EXISTS viaje_pagos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id        UUID        NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
  pagador_id      UUID        NOT NULL,
  receptor_id     UUID        NOT NULL,
  pagador_nombre  TEXT        NOT NULL,
  receptor_nombre TEXT        NOT NULL,
  monto           NUMERIC     NOT NULL,
  moneda          TEXT        NOT NULL DEFAULT 'ARS',
  fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Verificar: tabla `viaje_pagos` aparece en Table Editor con todas las columnas.

- [ ] **Step 3: Habilitar RLS en `viaje_pagos` (lectura para participantes del viaje)**

```sql
ALTER TABLE viaje_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viaje_pagos_select" ON viaje_pagos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM viaje_participantes
      WHERE viaje_participantes.viaje_id = viaje_pagos.viaje_id
        AND viaje_participantes.user_id = auth.uid()
    )
  );

CREATE POLICY "viaje_pagos_insert" ON viaje_pagos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM viaje_participantes
      WHERE viaje_participantes.viaje_id = viaje_pagos.viaje_id
        AND viaje_participantes.user_id = auth.uid()
    )
  );
```

---

### Task 2: Actualizar `deudoresService` — mapFromDB + marcarPagadaConNotificacion

**Files:**
- Modify: `src/services/deudoresService.js`

- [ ] **Step 1: Agregar `userId` y `viajeId` a `mapFromDB`**

Localizar la función `mapFromDB` al final del archivo (línea ~186). Reemplazarla completa:

```js
function mapFromDB(row) {
  return {
    id: row.id,
    userId: row.user_id,
    isFijo: row.es_fijo ?? false,
    esAcreedor: row.es_acreedor ?? true,
    nombre: row.nombre,
    descripcion: row.descripcion || '',
    monto: Number(row.monto),
    moneda: row.moneda || 'ARS',
    medio: row.medio || '',
    tipo: row.tipo || 'transferencia',
    cuotas: row.cuotas ?? 1,
    cantidad: row.cantidad ?? 1,
    pagado: row.pagado ?? false,
    fechaDeuda: row.fecha_deuda ? row.fecha_deuda.split('-').reverse().join('/') : '',
    fechaPago: row.fecha_pago ? row.fecha_pago.split('-').reverse().join('/') : null,
    compartidoConNombre: row.compartido_con_nombre || null,
    compartidoConUserId: row.compartido_con_user_id || null,
    ultimoRecordatorio: row.ultimo_recordatorio || null,
    viajeId: row.viaje_id || null,
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 2: Agregar inserción en `viaje_pagos` dentro de `marcarPagadaConNotificacion`**

Localizar `marcarPagadaConNotificacion` (línea ~114). El bloque `if (deudaActual.compartidoConUserId && user)` termina con `sendPushToUser(...)`. Después de ese `sendPushToUser(...)` y antes del cierre `}` del if, agregar:

```js
    if (deudaActual.viajeId) {
      const esAcreedor = deudaActual.esAcreedor;
      await supabase.from('viaje_pagos').insert({
        viaje_id:        deudaActual.viajeId,
        pagador_id:      esAcreedor ? deudaActual.compartidoConUserId : user.id,
        receptor_id:     esAcreedor ? user.id : deudaActual.compartidoConUserId,
        pagador_nombre:  esAcreedor ? (deudaActual.compartidoConNombre || deudaActual.nombre) : currentUserName,
        receptor_nombre: esAcreedor ? currentUserName : (deudaActual.compartidoConNombre || deudaActual.nombre),
        monto:           deudaActual.monto,
        moneda:          deudaActual.moneda || 'ARS',
      });
    }
```

La función completa resultante de `marcarPagadaConNotificacion` debe quedar:

```js
async marcarPagadaConNotificacion(id, deudaActual, currentUserName) {
  const { data: { user } } = await supabase.auth.getUser();
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('deudores')
    .update({ pagado: true, fecha_pago: today })
    .eq('id', id);
  if (error) throw error;

  if (deudaActual.compartidoConUserId && user) {
    const otroUserId = deudaActual.compartidoConUserId;
    const monto = deudaActual.monto;

    await Promise.all([
      supabase
        .from('deudores')
        .update({ pagado: true, fecha_pago: today })
        .eq('user_id', otroUserId)
        .eq('compartido_con_user_id', user.id)
        .eq('monto', monto)
        .eq('pagado', false),
      supabase
        .from('gastos')
        .update({ pagado: true })
        .eq('user_id', otroUserId)
        .eq('compartido_con_user_id', user.id)
        .eq('precio', monto)
        .eq('pagado', false),
      supabase
        .from('gastos')
        .update({ pagado: true })
        .eq('user_id', user.id)
        .eq('compartido_con_user_id', otroUserId)
        .eq('precio', monto)
        .eq('pagado', false),
    ]);

    sendPushToUser(otroUserId, {
      title: '✅ Deuda saldada',
      body: deudaActual.descripcion
        ? `${currentUserName} marcó como pagada "${deudaActual.descripcion}"`
        : `${currentUserName} marcó como pagada la deuda de ${deudaActual.nombre}`,
      data: { screen: 'Deudores' },
    });

    if (deudaActual.viajeId) {
      const esAcreedor = deudaActual.esAcreedor;
      await supabase.from('viaje_pagos').insert({
        viaje_id:        deudaActual.viajeId,
        pagador_id:      esAcreedor ? deudaActual.compartidoConUserId : user.id,
        receptor_id:     esAcreedor ? user.id : deudaActual.compartidoConUserId,
        pagador_nombre:  esAcreedor ? (deudaActual.compartidoConNombre || deudaActual.nombre) : currentUserName,
        receptor_nombre: esAcreedor ? currentUserName : (deudaActual.compartidoConNombre || deudaActual.nombre),
        monto:           deudaActual.monto,
        moneda:          deudaActual.moneda || 'ARS',
      });
    }
  }
},
```

- [ ] **Step 3: Commit**

```bash
git add src/services/deudoresService.js
git commit -m "feat: add viajeId/userId to deudoresService mapFromDB and insert viaje_pagos on payment"
```

---

### Task 3: Crear `viajePagosService.js`

**Files:**
- Create: `src/services/viajePagosService.js`

- [ ] **Step 1: Crear el archivo**

```js
import { supabase } from '../lib/supabase';

export const viajePagosService = {
  async getByViaje(viajeId) {
    const { data, error } = await supabase
      .from('viaje_pagos')
      .select('*')
      .eq('viaje_id', viajeId)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/viajePagosService.js
git commit -m "feat: add viajePagosService"
```

---

### Task 4: Actualizar `viajeGastosService.agregarGasto()` para crear deudas

**Files:**
- Modify: `src/services/viajeGastosService.js`

Después del bloque que registra en `viaje_gastos` (líneas ~92-98) y antes del `return mainGasto`, agregar la creación de deudas para cada participante que debe al pagador.

- [ ] **Step 1: Agregar helper `_crearDeudasViaje` al final del objeto `viajeGastosService`**

Al final del objeto `viajeGastosService`, antes del `}` de cierre, agregar el helper privado como función separada fuera del objeto (después del `};` final), y llamarla desde `agregarGasto`.

Agregar al final del archivo (después de la línea `};`):

```js
async function crearDeudasViaje(viajeId, pagadorId, pagadorNombre, deudores, share, gastoData) {
  if (!deudores.length) return;

  const fechaISO = gastoData.fecha?.includes('/')
    ? gastoData.fecha.split('/').reverse().join('-')
    : (gastoData.fecha || new Date().toISOString().split('T')[0]);

  const rows = [];
  for (const d of deudores) {
    // Fila del pagador (es_acreedor = true — le deben)
    rows.push({
      user_id:                 pagadorId,
      nombre:                  d.nombre,
      descripcion:             gastoData.objeto || null,
      monto:                   share,
      moneda:                  gastoData.moneda || 'ARS',
      medio:                   gastoData.medio || null,
      tipo:                    gastoData.tipo || 'transferencia',
      es_fijo:                 false,
      cuotas:                  1,
      cantidad:                1,
      pagado:                  false,
      fecha_deuda:             fechaISO,
      compartido_con_user_id:  d.userId,
      compartido_con_nombre:   d.nombre,
      es_acreedor:             true,
      viaje_id:                viajeId,
    });
    // Fila del participante (es_acreedor = false — debe al pagador)
    rows.push({
      user_id:                 d.userId,
      nombre:                  pagadorNombre,
      descripcion:             gastoData.objeto || null,
      monto:                   share,
      moneda:                  gastoData.moneda || 'ARS',
      medio:                   gastoData.medio || null,
      tipo:                    gastoData.tipo || 'transferencia',
      es_fijo:                 false,
      cuotas:                  1,
      cantidad:                1,
      pagado:                  false,
      fecha_deuda:             fechaISO,
      compartido_con_user_id:  pagadorId,
      compartido_con_nombre:   pagadorNombre,
      es_acreedor:             false,
      viaje_id:                viajeId,
    });
  }

  const { error } = await supabase.from('deudores').insert(rows);
  if (error) throw error;
}
```

- [ ] **Step 2: Llamar `crearDeudasViaje` desde `agregarGasto` antes del `return`**

Localizar en `agregarGasto` el bloque:

```js
    const { error } = await supabase.from('viaje_gastos').insert([{
      viaje_id: viajeId,
      gasto_id: mainGasto.id,
      pagado_por: user.id,
      modo_split: modoSplit,
      participantes: participantesIds,
    }]);
    if (error) throw error;

    return mainGasto;
```

Reemplazarlo por:

```js
    const { error } = await supabase.from('viaje_gastos').insert([{
      viaje_id: viajeId,
      gasto_id: mainGasto.id,
      pagado_por: user.id,
      modo_split: modoSplit,
      participantes: participantesIds,
    }]);
    if (error) throw error;

    // Create deudas for each participant who owes the payer
    if (modoSplit !== 'solo') {
      const pagadorNombre = viajeParticipantes.find(p => p.userId === user.id)?.nombre || user.email;
      let deudores = [];
      if (modoSplit === 'todos') {
        deudores = viajeParticipantes.filter(p => p.userId !== user.id);
      } else if (modoSplit === 'algunos') {
        deudores = participanteIds
          .filter(id => id !== user.id)
          .map(id => viajeParticipantes.find(p => p.userId === id))
          .filter(Boolean);
      }
      await crearDeudasViaje(viajeId, user.id, pagadorNombre, deudores, precioBase, gastoData);
    }

    return mainGasto;
```

- [ ] **Step 3: Verificar manualmente**

Con la app corriendo (`npx expo start`), entrar a un viaje con 2+ participantes y agregar un gasto con split "Todos". Luego:
- Ir a la pantalla de Deudores
- Verificar que aparecen las deudas con el monto dividido
- Verificar que el nombre del pagador y del participante son correctos

- [ ] **Step 4: Commit**

```bash
git add src/services/viajeGastosService.js
git commit -m "feat: create deudores records when adding viaje gasto with split"
```

---

### Task 5: Actualizar `DeudaCard` — tag de viaje

**Files:**
- Modify: `src/components/DeudaCard.jsx`

Mostrar un badge `🧳 Viaje` cuando `deuda.viajeId` es truthy. Va junto a los badges de tipo en la fila `meta`.

- [ ] **Step 1: Agregar el badge en la sección de meta**

Localizar en `DeudaCard` el bloque que renderiza los badges (alrededor de la línea que tiene `deuda.compartidoConNombre`). Buscar el bloque:

```jsx
              {deuda.isFijo && (
                <View style={[s.tipoBadge, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
                  <Text style={[s.tipoBadgeText, { color: colors.warning }]}>Fija</Text>
```

Después del bloque `deuda.isFijo` (después del `)}` que lo cierra), agregar:

```jsx
              {!!deuda.viajeId && (
                <View style={[s.tipoBadge, { backgroundColor: '#6366F120', borderColor: '#6366F1' }]}>
                  <Text style={[s.tipoBadgeText, { color: '#6366F1' }]}>🧳 Viaje</Text>
                </View>
              )}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DeudaCard.jsx
git commit -m "feat: show viaje badge in DeudaCard when deuda has viajeId"
```

---

### Task 6: Crear `ViajesPagosTab` y actualizar `ViajeDetailScreen`

**Files:**
- Create: `src/components/viajes/ViajesPagosTab.jsx`
- Modify: `src/screens/ViajeDetailScreen.jsx`

- [ ] **Step 1: Crear `ViajesPagosTab.jsx`**

```jsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../constants/theme';

const PARTICIPANT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ViajesPagosTab({ pagos, participantColor, dark }) {
  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;

  if (pagos.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: bg }]}>
        <Text style={[styles.emptyText, { color: subtextColor }]}>
          Nadie ha pagado sus deudas del viaje todavía.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      <Text style={[styles.sectionLabel, { color: subtextColor }]}>PAGOS REGISTRADOS</Text>
      {pagos.map(p => {
        const pagadorColor = participantColor ? participantColor(p.pagador_id) : PARTICIPANT_COLORS[0];
        const fecha = p.fecha
          ? new Date(p.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '';
        const montoFmt = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(p.monto);
        const simbolo = p.moneda === 'ARS' ? '$' : p.moneda;

        return (
          <View key={p.id} style={[styles.card, { backgroundColor: surfaceBg }]}>
            <View style={[styles.avatar, { backgroundColor: pagadorColor }]}>
              <Text style={styles.avatarText}>{p.pagador_nombre?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nombres, { color: textColor }]}>
                {p.pagador_nombre} <Text style={{ color: subtextColor }}>→</Text> {p.receptor_nombre}
              </Text>
              <Text style={[styles.fecha, { color: subtextColor }]}>{fecha}</Text>
            </View>
            <Text style={[styles.monto, { color: '#10B981' }]}>
              {simbolo} {montoFmt}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    opacity: 0.6,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  nombres: { ...typography.bodyMed, marginBottom: 2 },
  fecha: { ...typography.caption },
  monto: { ...typography.bodyMed, fontWeight: '700' },
});
```

- [ ] **Step 2: Actualizar `ViajeDetailScreen`**

Localizar en `src/screens/ViajeDetailScreen.jsx`:

**2a. Agregar import de `viajePagosService` y `ViajesPagosTab`:**

Buscar la línea:
```js
import ViajeNotasTab from '../components/viajes/ViajeNotasTab';
```

Reemplazarla por:
```js
import ViajeNotasTab from '../components/viajes/ViajeNotasTab';
import ViajesPagosTab from '../components/viajes/ViajesPagosTab';
import { viajePagosService } from '../services/viajePagosService';
```

**2b. Cambiar los tabs:**

Buscar:
```js
const TABS = ['💸 Gastos', '⚖️ Balance', '✅ Notas'];
```

Reemplazar por:
```js
const TABS = ['💸 Gastos', '⚖️ Balance', '💳 Pagos', '✅ Notas'];
```

**2c. Agregar estado `pagos`:**

Buscar:
```js
  const [showOpciones, setShowOpciones] = useState(false);
```

Reemplazar por:
```js
  const [showOpciones, setShowOpciones] = useState(false);
  const [pagos, setPagos] = useState([]);
```

**2d. Actualizar `cargar()` para cargar `pagos`:**

Buscar:
```js
      const [v, g] = await Promise.all([
        viajesService.getById(viajeId),
        viajeGastosService.getByViaje(viajeId),
      ]);
      setViaje(v);
      setGastos(g);
```

Reemplazar por:
```js
      const [v, g, p] = await Promise.all([
        viajesService.getById(viajeId),
        viajeGastosService.getByViaje(viajeId),
        viajePagosService.getByViaje(viajeId),
      ]);
      setViaje(v);
      setGastos(g);
      setPagos(p);
```

**2e. Actualizar el renderizado de tabs:**

Buscar:
```jsx
      {tabIdx === 2 && (
        <ViajeNotasTab
          viaje={viaje}
          dark={dark}
        />
      )}
```

Reemplazar por:
```jsx
      {tabIdx === 2 && (
        <ViajesPagosTab
          pagos={pagos}
          participantColor={participantColor}
          dark={dark}
        />
      )}
      {tabIdx === 3 && (
        <ViajeNotasTab
          viaje={viaje}
          dark={dark}
        />
      )}
```

- [ ] **Step 3: Verificar manualmente**

Con la app corriendo, entrar a un viaje que tenga gastos con split. Luego:
- Ir a Deudores, deslizar una deuda del viaje y marcarla como pagada
- Volver al viaje, entrar a la pestaña "💳 Pagos"
- Verificar que aparece el pago: `Pepito → Juancito  $500  28/05/2026`

- [ ] **Step 4: Commit**

```bash
git add src/components/viajes/ViajesPagosTab.jsx src/screens/ViajeDetailScreen.jsx
git commit -m "feat: add Pagos tab to ViajeDetailScreen with ViajesPagosTab component"
```
