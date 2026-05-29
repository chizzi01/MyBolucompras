# Viaje Gastos Resumen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la creación de gastos individuales por participante al agregar un gasto de viaje, por un único gasto resumen por usuario al cerrar el viaje, con estilo visual boarding pass en GastoCard.

**Architecture:** Los gastos de viaje se almacenan solo en `viaje_gastos` (con columnas propias para objeto/precio/fecha/etiqueta). Al cerrar el viaje se genera un único gasto en `gastos` por participante con su parte proporcional. El balance interno del viaje incorpora `viaje_pagos` para registrar pagos parciales entre participantes.

**Tech Stack:** React Native, Supabase (PostgreSQL + RLS), TanStack Query v5, @expo/vector-icons

---

## File Map

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/20260529_viaje_pagos.sql` | Crear — migración DB |
| `src/services/viajePagosService.js` | Crear — CRUD viaje_pagos |
| `src/hooks/queries/useViajePagos.js` | Crear — React Query hook |
| `src/components/viajes/RegistrarPagoModal.jsx` | Crear — modal pago entre participantes |
| `src/services/viajeGastosService.js` | Modificar — eliminar creación de gastos, leer datos propios, actualizar calcularBalance |
| `src/services/viajesService.js` | Modificar — cerrar con validación + generación de resumen |
| `src/services/gastosService.js` | Modificar — mapFromDB agrega viajeId/viajeNombre |
| `src/components/GastoCard.jsx` | Modificar — boarding pass style cuando viajeId presente |
| `src/components/viajes/ViajeBalanceTab.jsx` | Modificar — usar pagos en balance + botón Registrar pago |
| `src/components/viajes/CerrarViajeModal.jsx` | Modificar — mostrar error si debts pendientes |
| `src/hooks/mutations/useViajeMutations.js` | Modificar — invalidar gastos cache al cerrar |
| `src/hooks/mutations/useViajeGastoMutations.js` | Modificar — eliminar invalidación de gastos al agregar |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260529_viaje_pagos.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/20260529_viaje_pagos.sql
-- NOTE: Run manually in Supabase Dashboard SQL Editor.

-- 1. Agregar columnas de expense data a viaje_gastos
ALTER TABLE public.viaje_gastos
  ADD COLUMN IF NOT EXISTS objeto text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS precio numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha date,
  ADD COLUMN IF NOT EXISTS etiqueta text;

-- Hacer gasto_id nullable (antes era NOT NULL)
ALTER TABLE public.viaje_gastos
  ALTER COLUMN gasto_id DROP NOT NULL;

-- 2. Agregar campos viaje a gastos (para los gastos resumen al cerrar)
ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS viaje_id uuid REFERENCES public.viajes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS viaje_nombre text;

CREATE INDEX IF NOT EXISTS idx_gastos_viaje_id ON public.gastos(viaje_id);

-- 3. Crear tabla viaje_pagos
CREATE TABLE IF NOT EXISTS public.viaje_pagos (
  id           uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id     uuid      REFERENCES public.viajes(id) ON DELETE CASCADE NOT NULL,
  pagador_id   uuid      REFERENCES public.profiles(id) NOT NULL,
  receptor_id  uuid      REFERENCES public.profiles(id) NOT NULL,
  monto        numeric   NOT NULL,
  fecha        timestamp DEFAULT now(),
  created_at   timestamp DEFAULT now()
);

ALTER TABLE public.viaje_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vpagos_all" ON public.viaje_pagos
  USING (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()))
  WITH CHECK (viaje_id IN (SELECT viaje_id FROM public.viaje_participantes WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_viaje_pagos_viaje_id ON public.viaje_pagos(viaje_id);
```

- [ ] **Step 2: Ejecutar en Supabase Dashboard**

Abrir Supabase Dashboard → SQL Editor → pegar y ejecutar el archivo completo. Verificar que no hay errores y que las tablas/columnas existen.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260529_viaje_pagos.sql
git commit -m "feat: add viaje_pagos table, viaje fields to gastos, expense cols to viaje_gastos"
```

---

## Task 2: viajePagosService

**Files:**
- Create: `src/services/viajePagosService.js`

- [ ] **Step 1: Crear el servicio**

```js
// src/services/viajePagosService.js
import { supabase } from '../lib/supabase';

export const viajePagosService = {
  async getByViaje(viajeId) {
    const { data, error } = await supabase
      .from('viaje_pagos')
      .select('*')
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      viajeId: row.viaje_id,
      pagadorId: row.pagador_id,
      receptorId: row.receptor_id,
      monto: Number(row.monto),
      fecha: row.fecha,
      createdAt: row.created_at,
    }));
  },

  async registrar(viajeId, pagadorId, receptorId, monto) {
    const { data, error } = await supabase
      .from('viaje_pagos')
      .insert([{ viaje_id: viajeId, pagador_id: pagadorId, receptor_id: receptorId, monto }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/viajePagosService.js
git commit -m "feat: add viajePagosService for registering payments within a trip"
```

---

## Task 3: useViajePagos hook

**Files:**
- Create: `src/hooks/queries/useViajePagos.js`

- [ ] **Step 1: Crear el hook**

```js
// src/hooks/queries/useViajePagos.js
import { useQuery } from '@tanstack/react-query';
import { viajePagosService } from '../../services/viajePagosService';

export function useViajePagos(viajeId) {
  const query = useQuery({
    queryKey: ['viaje_pagos', viajeId],
    queryFn: () => viajePagosService.getByViaje(viajeId),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!viajeId,
  });
  return {
    ...query,
    pagos: query.data ?? [],
    loading: query.isLoading,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/queries/useViajePagos.js
git commit -m "feat: add useViajePagos query hook"
```

---

## Task 4: Actualizar viajeGastosService

**Files:**
- Modify: `src/services/viajeGastosService.js`

- [ ] **Step 1: Reemplazar `getByViaje` para leer datos propios de viaje_gastos (sin join a gastos)**

Reemplazar la función `getByViaje` completa:

```js
async getByViaje(viajeId) {
  const { data, error } = await supabase
    .from('viaje_gastos')
    .select(`
      *,
      pagador:pagado_por(id, nombre, email)
    `)
    .eq('viaje_id', viajeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    objeto: row.objeto || '',
    precio: Number(row.precio || 0),
    fecha: row.fecha || '',
    etiqueta: row.etiqueta || '',
    pagadoPor: row.pagado_por,
    pagadorNombre: row.pagador?.nombre || row.pagador?.email || row.pagado_por,
    modoSplit: row.modo_split,
    participantes: row.participantes || [],
    createdAt: row.created_at,
  }));
},
```

- [ ] **Step 2: Reemplazar `agregarGasto` para NO crear gastos en tabla gastos**

Reemplazar la función `agregarGasto` completa:

```js
async agregarGasto(viajeId, gastoData, splitConfig, viajeParticipantes) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) throw new Error('No autenticado');

  const { modoSplit, participanteIds } = splitConfig;

  const participantesIds = modoSplit === 'todos'
    ? viajeParticipantes.map(p => p.userId)
    : modoSplit === 'algunos'
      ? participanteIds
      : [user.id];

  const fechaISO = gastoData.fecha?.includes('/')
    ? gastoData.fecha.split('/').reverse().join('-')
    : (gastoData.fecha || new Date().toISOString().split('T')[0]);

  const { error } = await supabase.from('viaje_gastos').insert([{
    viaje_id: viajeId,
    gasto_id: null,
    objeto: gastoData.objeto,
    precio: Number(gastoData.precio),
    fecha: fechaISO,
    etiqueta: gastoData.etiqueta || null,
    pagado_por: user.id,
    modo_split: modoSplit,
    participantes: participantesIds,
  }]);
  if (error) throw error;

  // Notificaciones push para otros participantes (sin cambios)
  const otherParticipants = (viajeParticipantes || []).filter(p => p.userId !== user.id);
  if (otherParticipants.length > 0) {
    supabase.from('viajes').select('titulo, emoji').eq('id', viajeId).single()
      .then(({ data: viaje }) => {
        if (!viaje) return;
        supabase.from('profiles').select('nombre').eq('id', user.id).single()
          .then(({ data: prof }) => {
            const pagadorName = prof?.nombre || user.email?.split('@')[0] || 'Alguien';
            otherParticipants.forEach(p => {
              sendPushToUser(p.userId, {
                title: `${viaje.emoji || '💸'} Gasto en ${viaje.titulo}`,
                body: `${pagadorName} agregó "${gastoData.objeto}" por $${Number(gastoData.precio).toFixed(0)}`,
                data: { type: 'gasto_creado', viajeId },
              });
            });
          });
      })
      .catch(err => console.warn('[Push] Error sending expense notification:', err.message));
  }
},
```

- [ ] **Step 3: Reemplazar `calcularBalance` para usar g.precio como total y aceptar pagos**

Reemplazar la función `calcularBalance` completa:

```js
calcularBalance(viajeGastos, participantes, pagos = []) {
  const nets = {};
  for (const p of participantes) nets[p.userId] = 0;

  for (const g of viajeGastos) {
    if (g.modoSplit === 'solo') continue;

    const ids = g.participantes.length ? g.participantes : participantes.map(p => p.userId);
    const n = ids.length;
    const fullAmount = g.precio; // g.precio es el total pagado (no por-persona)
    const perPersona = fullAmount / n;

    nets[g.pagadoPor] = (nets[g.pagadoPor] || 0) + fullAmount - perPersona;
    for (const id of ids) {
      if (id !== g.pagadoPor) {
        nets[id] = (nets[id] || 0) - perPersona;
      }
    }
  }

  // Descontar pagos registrados
  for (const p of pagos) {
    nets[p.pagadorId] = (nets[p.pagadorId] || 0) + p.monto;
    nets[p.receptorId] = (nets[p.receptorId] || 0) - p.monto;
  }

  const porPersona = participantes.map(p => ({
    userId: p.userId,
    nombre: p.nombre,
    total: viajeGastos
      .filter(g => g.pagadoPor === p.userId)
      .reduce((sum, g) => sum + g.precio, 0),
    neto: Math.round((nets[p.userId] || 0) * 100) / 100,
  }));

  const creditors = porPersona.filter(p => p.neto > 0.01).map(p => ({ ...p }));
  const debtors   = porPersona.filter(p => p.neto < -0.01).map(p => ({ ...p }));
  creditors.sort((a, b) => b.neto - a.neto);
  debtors.sort((a, b) => a.neto - b.neto);

  const liquidacion = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].neto, -debtors[di].neto);
    liquidacion.push({
      de: debtors[di].userId,
      deNombre: debtors[di].nombre,
      hacia: creditors[ci].userId,
      haciaNombre: creditors[ci].nombre,
      monto: Math.round(amount * 100) / 100,
    });
    creditors[ci].neto -= amount;
    debtors[di].neto  += amount;
    if (creditors[ci].neto < 0.01) ci++;
    if (-debtors[di].neto  < 0.01) di++;
  }

  return { porPersona, liquidacion };
},
```

- [ ] **Step 4: Commit**

```bash
git add src/services/viajeGastosService.js
git commit -m "feat: viajeGastosService stores expense data in viaje_gastos, removes gastos creation"
```

---

## Task 5: Actualizar gastosService.mapFromDB

**Files:**
- Modify: `src/services/gastosService.js:233-252`

- [ ] **Step 1: Agregar viajeId y viajeNombre a mapFromDB**

En la función `mapFromDB`, agregar dos campos al objeto retornado después de `pagado`:

```js
function mapFromDB(row) {
  return {
    id: row.id,
    isFijo: row.es_fijo,
    objeto: row.objeto,
    fecha: row.fecha ? row.fecha.split('-').reverse().join('/') : '',
    medio: row.medio,
    cuotas: row.cuotas,
    tipo: row.tipo,
    moneda: row.moneda,
    banco: row.banco || '',
    cantidad: row.cantidad,
    precio: `$ ${Number(row.precio).toFixed(2)}`,
    precioNum: Number(row.precio),
    etiqueta: row.etiqueta || '',
    compartidoConNombre: row.compartido_con_nombre || null,
    compartidoConUserId: row.compartido_con_user_id || null,
    pagado: row.pagado ?? false,
    viajeId: row.viaje_id || null,
    viajeNombre: row.viaje_nombre || null,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/gastosService.js
git commit -m "feat: mapFromDB exposes viajeId and viajeNombre fields"
```

---

## Task 6: Actualizar viajesService.cerrar con validación y generación de resumen

**Files:**
- Modify: `src/services/viajesService.js`

- [ ] **Step 1: Agregar imports al tope del archivo**

Agregar después de la línea del import existente:

```js
import { viajeGastosService } from './viajeGastosService';
import { viajePagosService } from './viajePagosService';
```

- [ ] **Step 2: Reemplazar la función `cerrar`**

```js
async cerrar(id) {
  const [viaje, gastos, pagos] = await Promise.all([
    viajesService.getById(id),
    viajeGastosService.getByViaje(id),
    viajePagosService.getByViaje(id),
  ]);

  const { liquidacion } = viajeGastosService.calcularBalance(gastos, viaje.participantes, pagos);
  if (liquidacion.length > 0) {
    const nombres = [...new Set(liquidacion.map(l => l.deNombre))].join(', ');
    throw new Error(`Saldos pendientes: ${nombres}`);
  }

  const today = new Date().toISOString().split('T')[0];
  const summaryRows = viaje.participantes
    .map(p => {
      const share = gastos
        .filter(g => {
          if (g.modoSplit === 'solo') return g.pagadoPor === p.userId;
          const ids = g.participantes.length
            ? g.participantes
            : viaje.participantes.map(x => x.userId);
          return ids.includes(p.userId);
        })
        .reduce((sum, g) => {
          if (g.modoSplit === 'solo') return sum + g.precio;
          const n = g.participantes.length || viaje.participantes.length;
          return sum + g.precio / n;
        }, 0);

      return {
        es_fijo: false,
        objeto: `Gastos: ${viaje.titulo}`,
        fecha: today,
        medio: null,
        cuotas: 1,
        tipo: null,
        moneda: 'ARS',
        banco: null,
        cantidad: 1,
        precio: Math.round(share * 100) / 100,
        etiqueta: null,
        compartido_con_nombre: null,
        compartido_con_user_id: null,
        pagado: false,
        viaje_id: id,
        viaje_nombre: viaje.titulo,
        user_id: p.userId,
      };
    })
    .filter(r => r.precio > 0);

  if (summaryRows.length > 0) {
    const { error: insertError } = await supabase.from('gastos').insert(summaryRows);
    if (insertError) throw insertError;
  }

  const { error } = await supabase
    .from('viajes')
    .update({ estado: 'cerrado', fecha_cierre: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
},
```

- [ ] **Step 3: Agregar función `reabrir` después de `cerrar`**

```js
async reabrir(id) {
  const { error: deleteError } = await supabase
    .from('gastos')
    .delete()
    .eq('viaje_id', id);
  if (deleteError) throw deleteError;

  const { error } = await supabase
    .from('viajes')
    .update({ estado: 'activo', fecha_cierre: null })
    .eq('id', id);
  if (error) throw error;
},
```

- [ ] **Step 4: Commit**

```bash
git add src/services/viajesService.js
git commit -m "feat: cerrar viaje validates debts and creates summary gastos per participant"
```

---

## Task 7: Actualizar useViajeMutations para invalidar gastos al cerrar

**Files:**
- Modify: `src/hooks/mutations/useViajeMutations.js:32-35`

- [ ] **Step 1: Agregar invalidación de gastos en `onSettled` de la mutación `cerrar`**

Reemplazar el `onSettled` existente:

```js
onSettled: (_, __, id) => {
  queryClient.invalidateQueries({ queryKey: listKey });
  queryClient.invalidateQueries({ queryKey: ['viaje', id] });
  queryClient.invalidateQueries({ queryKey: ['gastos'] });
},
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/mutations/useViajeMutations.js
git commit -m "fix: invalidate gastos cache after closing a trip"
```

---

## Task 8: Actualizar useViajeGastoMutations para no invalidar gastos al agregar

**Files:**
- Modify: `src/hooks/mutations/useViajeGastoMutations.js:13-15`

- [ ] **Step 1: Eliminar la invalidación de gastos en `onSettled`**

Reemplazar el `onSettled` existente:

```js
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['viaje-gastos', viajeId] });
},
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/mutations/useViajeGastoMutations.js
git commit -m "fix: remove gastos cache invalidation when adding viaje gasto"
```

---

## Task 9: RegistrarPagoModal

**Files:**
- Create: `src/components/viajes/RegistrarPagoModal.jsx`

- [ ] **Step 1: Crear el componente**

```jsx
// src/components/viajes/RegistrarPagoModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { viajePagosService } from '../../services/viajePagosService';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { formatMontoEuropeo } from '../../utils/formatters';

export default function RegistrarPagoModal({ visible, onClose, viaje, transaccion, dark }) {
  const [monto, setMonto] = useState('');
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (transaccion) setMonto(String(transaccion.monto));
  }, [transaccion]);

  const bg = dark ? colors.background.dark : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const inputBg = dark ? '#1E293B' : '#F8FAFC';
  const borderColor = dark ? colors.border.dark : colors.border.light;

  const registrar = useMutation({
    mutationFn: () =>
      viajePagosService.registrar(viaje.id, transaccion.de, transaccion.hacia, Number(monto)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viaje_pagos', viaje.id] });
      onClose();
    },
  });

  const handleConfirm = () => {
    const n = Number(monto);
    if (!n || n <= 0) return;
    registrar.mutate();
  };

  if (!transaccion) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />

          <Text style={[styles.title, { color: textColor }]}>Registrar pago</Text>
          <Text style={[styles.sub, { color: subtextColor }]}>
            {transaccion.deNombre} → {transaccion.haciaNombre}
          </Text>
          <Text style={[styles.deuda, { color: dark ? '#818CF8' : '#4F46E5' }]}>
            Deuda total: ${formatMontoEuropeo(transaccion.monto)}
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            value={monto}
            onChangeText={setMonto}
            keyboardType="numeric"
            placeholder="Monto"
            placeholderTextColor={subtextColor}
            selectTextOnFocus
          />

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent }]}
            onPress={handleConfirm}
            disabled={registrar.isPending}
          >
            {registrar.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Confirmar pago</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={{ color: subtextColor, fontSize: 15 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md },
  handle: {
    width: 40, height: 4, backgroundColor: '#CBD5E1',
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg,
  },
  title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.sm },
  sub: { ...typography.body, textAlign: 'center', marginBottom: 4 },
  deuda: { textAlign: 'center', fontWeight: '700', fontSize: 16, marginBottom: spacing.md },
  input: {
    borderWidth: 1, borderRadius: radius.md,
    padding: spacing.sm, fontSize: 18, textAlign: 'center',
    marginBottom: spacing.md,
  },
  btn: {
    borderRadius: radius.md, paddingVertical: 14,
    alignItems: 'center', marginBottom: spacing.sm,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/viajes/RegistrarPagoModal.jsx
git commit -m "feat: add RegistrarPagoModal for recording partial/full payments within a trip"
```

---

## Task 10: Actualizar ViajeBalanceTab con pagos y botón Registrar pago

**Files:**
- Modify: `src/components/viajes/ViajeBalanceTab.jsx`

- [ ] **Step 1: Reemplazar el archivo completo**

```jsx
// src/components/viajes/ViajeBalanceTab.jsx
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { viajeGastosService } from '../../services/viajeGastosService';
import { useViajePagos } from '../../hooks/queries/useViajePagos';
import { colors, spacing, typography } from '../../constants/theme';
import { formatMontoEuropeo } from '../../utils/formatters';
import RegistrarPagoModal from './RegistrarPagoModal';

export default function ViajeBalanceTab({ viaje, gastos, participantColor, dark }) {
  const [pagoModal, setPagoModal] = useState(null);
  const { pagos } = useViajePagos(viaje.id);

  const bg = dark ? colors.background.dark : colors.background.light;
  const surfaceBg = dark ? '#1E293B' : '#fff';
  const textColor = dark ? colors.text.dark : colors.text.light;
  const subtextColor = dark ? colors.textSecondary.dark : colors.textSecondary.light;
  const borderColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const barBgColor = dark ? '#263347' : '#E2E8F0';
  const amountColor = dark ? '#818CF8' : '#4F46E5';

  const { porPersona, liquidacion } = useMemo(
    () => viajeGastosService.calcularBalance(gastos, viaje.participantes, pagos),
    [gastos, viaje.participantes, pagos]
  );

  const maxTotal = Math.max(...porPersona.map(p => p.total), 1);

  const sectionLabel = (title) => (
    <Text style={[styles.sectionLabel, { color: subtextColor }]}>{title}</Text>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
    >
      {sectionLabel('CUÁNTO PUSO CADA UNO')}
      {porPersona.map(p => {
        const color = participantColor(p.userId);
        const netoPositive = p.neto > 0;
        return (
          <View key={p.userId} style={[styles.card, { backgroundColor: surfaceBg, borderColor }]}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: color }]}>
                <Text style={styles.avatarText}>{p.nombre?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nombre, { color: textColor }]}>{p.nombre}</Text>
                <Text style={[styles.sub, { color: subtextColor }]}>Pagó ${formatMontoEuropeo(p.total)} total</Text>
              </View>
              <Text style={[styles.neto, {
                color: netoPositive ? '#10B981' : p.neto < 0 ? colors.error : subtextColor,
              }]}>
                {netoPositive ? '+$' : p.neto < 0 ? '-$' : '$'}{formatMontoEuropeo(Math.abs(p.neto))}
              </Text>
            </View>
            <View style={[styles.barBg, { backgroundColor: barBgColor }]}>
              <View style={[styles.bar, { width: `${(p.total / maxTotal) * 100}%`, backgroundColor: color }]} />
            </View>
            <View style={styles.barLegend}>
              <Text style={[styles.barLeg, { color: subtextColor }]}>$0</Text>
              <Text style={[styles.barLeg, { color: subtextColor }]}>${formatMontoEuropeo(maxTotal)}</Text>
            </View>
          </View>
        );
      })}

      {liquidacion.length > 0 && (
        <>
          {sectionLabel('CÓMO LIQUIDAR')}
          {liquidacion.map((t) => (
            <View key={`${t.de}-${t.hacia}`} style={[styles.transCard, { backgroundColor: surfaceBg, borderColor }]}>
              <View style={[styles.avatar, { backgroundColor: participantColor(t.de) }]}>
                <Text style={styles.avatarText}>{t.deNombre?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.transInfo}>
                <Text style={[styles.transNames, { color: textColor }]}>{t.deNombre} → {t.haciaNombre}</Text>
                <Text style={[styles.transSub, { color: subtextColor }]}>debe transferir</Text>
              </View>
              <View style={[styles.avatar, { backgroundColor: participantColor(t.hacia) }]}>
                <Text style={styles.avatarText}>{t.haciaNombre?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.amountPill}>
                <Text style={[styles.amountText, { color: amountColor }]}>${formatMontoEuropeo(t.monto)}</Text>
              </View>
              {viaje.estado === 'activo' && (
                <TouchableOpacity
                  style={[styles.pagarBtn, { backgroundColor: dark ? '#1a3a2e' : '#D1FAE5', borderColor: '#10B981' }]}
                  onPress={() => setPagoModal(t)}
                >
                  <Text style={styles.pagarText}>Registrar pago</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </>
      )}

      {liquidacion.length === 0 && porPersona.length > 0 && (
        <View style={[styles.card, { backgroundColor: surfaceBg, borderColor, alignItems: 'center', padding: spacing.lg }]}>
          <Text style={{ fontSize: 32 }}>✅</Text>
          <Text style={[styles.sub, { color: subtextColor, marginTop: 8 }]}>Todo está saldado</Text>
        </View>
      )}

      <RegistrarPagoModal
        visible={!!pagoModal}
        onClose={() => setPagoModal(null)}
        viaje={viaje}
        transaccion={pagoModal}
        dark={dark}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.captionMed, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  card: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nombre: { ...typography.bodyMed },
  sub: { ...typography.caption, marginTop: 2 },
  neto: { ...typography.bodyBold, fontSize: 18 },
  barBg: { height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  bar: { height: 6, borderRadius: 4 },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  barLeg: { fontSize: 10 },
  transCard: {
    borderRadius: 12, padding: 10, marginBottom: 5,
    borderWidth: 1, flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, flexWrap: 'wrap',
  },
  transInfo: { flex: 1 },
  transNames: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  transSub: { fontSize: 10 },
  amountPill: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  amountText: { fontSize: 13, fontWeight: '800' },
  pagarBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  pagarText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/viajes/ViajeBalanceTab.jsx
git commit -m "feat: ViajeBalanceTab uses viaje_pagos in balance calculation and adds Registrar pago button"
```

---

## Task 11: Actualizar CerrarViajeModal para mostrar error de validación

**Files:**
- Modify: `src/components/viajes/CerrarViajeModal.jsx`

- [ ] **Step 1: Agregar state de error y mostrarlo en la UI**

Agregar después de las declaraciones existentes dentro del componente:

```js
const [error, setError] = useState(null);
```

- [ ] **Step 2: Actualizar `handleCerrar` para capturar el error**

Reemplazar la función `handleCerrar`:

```js
const handleCerrar = () => {
  setError(null);
  cerrarMutation.mutate(viaje.id, {
    onSuccess: () => {
      onClose();
      onCerrado?.();
    },
    onError: (err) => {
      setError(err.message);
    },
  });
};
```

- [ ] **Step 3: Agregar bloque de error en el JSX, justo antes del botón "Sí, cerrar viaje"**

```jsx
{error && (
  <View style={[styles.errorBox, { backgroundColor: dark ? '#2d1515' : '#FEE2E2' }]}>
    <Text style={styles.errorText}>{error}</Text>
  </View>
)}
```

Y en el `StyleSheet.create`, agregar:

```js
errorBox: {
  borderRadius: radius.md, padding: spacing.sm,
  marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.error,
},
errorText: { color: colors.error, fontSize: 13, textAlign: 'center' },
```

- [ ] **Step 4: Agregar import de useState al tope**

Reemplazar `import React from 'react';` con:

```js
import React, { useState } from 'react';
```

- [ ] **Step 5: Commit**

```bash
git add src/components/viajes/CerrarViajeModal.jsx
git commit -m "feat: CerrarViajeModal shows validation error when debts are pending"
```

---

## Task 12: GastoCard — estilo boarding pass

**Files:**
- Modify: `src/components/GastoCard.jsx`

- [ ] **Step 1: Agregar el componente `BoardingPassContent` antes del export default**

Agregar antes de la línea `export default function GastoCard`:

```jsx
function BoardingPassContent({ gasto, precioDisplay, dark }) {
  const mainBg = dark ? '#1e1b4b' : '#f8faff';
  const titleColor = dark ? '#e2e8f0' : '#1e1b4b';
  const priceColor = dark ? '#818cf8' : '#4338ca';
  const labelColor = dark ? '#6366f1' : '#818cf8';
  const dateColor = dark ? '#64748b' : '#94a3b8';
  const dividerColor = dark ? '#4338ca' : '#c7d2fe';

  return (
    <View style={bpStyles.card}>
      <View style={[bpStyles.main, { backgroundColor: mainBg, borderRightColor: dividerColor }]}>
        <Text style={[bpStyles.tripLabel, { color: labelColor }]}>VIAJE</Text>
        <Text style={[bpStyles.objeto, { color: titleColor }]} numberOfLines={2}>{gasto.objeto}</Text>
        <Text style={[bpStyles.precio, { color: priceColor }]}>{precioDisplay}</Text>
        <Text style={[bpStyles.fecha, { color: dateColor }]}>{gasto.fecha}</Text>
      </View>
      <View style={bpStyles.stub}>
        <Text style={bpStyles.planeEmoji}>✈️</Text>
        <Text style={bpStyles.stubText} numberOfLines={5}>{gasto.viajeNombre}</Text>
      </View>
    </View>
  );
}

const bpStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 80,
  },
  main: {
    flex: 1,
    padding: 12,
    borderRightWidth: 1,
  },
  tripLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  objeto: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  precio: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  fecha: {
    fontSize: 10,
  },
  stub: {
    width: 64,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  planeEmoji: {
    fontSize: 20,
  },
  stubText: {
    color: '#e0e7ff',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Actualizar el return de `GastoCard` para usar BoardingPassContent cuando viajeId está presente**

Reemplazar la parte del `Animated.View` y `TouchableOpacity` dentro del return de `GastoCard`. El bloque actual empieza en la línea `<Animated.View` y termina en `</Animated.View>`. Reemplazarlo por:

```jsx
<Animated.View
  style={{ transform: [{ translateX }], flex: 1 }}
  {...panResponder.panHandlers}
>
  <TouchableOpacity
    style={gasto.viajeId ? null : s.card}
    onPress={() => { if (open) { close(); } else { onPress(); } }}
    activeOpacity={0.75}
  >
    {gasto.viajeId ? (
      <BoardingPassContent
        gasto={gasto}
        precioDisplay={precioDisplay}
        dark={dark}
      />
    ) : (
      <View style={[s.left, !entraEsteMes && s.contentDimmed]}>
        <Text style={s.objeto} numberOfLines={1}>{gasto.objeto}</Text>
        <View style={s.meta}>
          <MedioIcon medio={gasto.medio} dark={dark} />
          {etiquetaObj ? (
            <View style={[s.tag, { backgroundColor: etiquetaObj.color + '25', borderColor: etiquetaObj.color }]}>
              <Text style={[s.tagText, { color: etiquetaObj.color }]}>{etiquetaObj.nombre}</Text>
            </View>
          ) : null}
          {isPaidShared ? (
            <View style={s.paidBadge}>
              <Ionicons name="checkmark-circle" size={10} color={colors.accent} />
              <Text style={s.paidBadgeText}>Pagado</Text>
            </View>
          ) : gasto.compartidoConNombre ? (
            <View style={s.sharedBadge}>
              <Ionicons name="people-outline" size={10} color={dark ? '#94A3B8' : '#64748B'} />
              <Text style={s.sharedBadgeText} numberOfLines={1}>{gasto.compartidoConNombre}</Text>
            </View>
          ) : null}
        </View>
      </View>
    )}
    {!gasto.viajeId && (
      <View style={[s.right, !entraEsteMes && s.contentDimmed]}>
        <Text style={s.precio}>{precioDisplay}</Text>
        {precioTotal && <Text style={s.precioTotal}>{precioTotal}</Text>}
        <View style={s.badgesRow}>
          {!entraEsteMes && (
            <View style={s.nextMonthBadge}>
              <Ionicons name="time-outline" size={11} color={dark ? '#64748B' : '#94A3B8'} />
            </View>
          )}
          <View style={[s.cuotasBadge, { backgroundColor: cuotasColor.bg }]}>
            <Text style={[s.cuotasText, { color: cuotasColor.text }]}>
              {gasto.isFijo ? '∞' : `${cuotasRest}/${gasto.cuotas}`}
            </Text>
          </View>
        </View>
      </View>
    )}
  </TouchableOpacity>
</Animated.View>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/GastoCard.jsx
git commit -m "feat: GastoCard renders boarding pass style for viaje summary expenses"
```

---

## Verificación final

- [ ] **Step 1: Correr la app y verificar flujo completo**

1. Abrir la app → ir a un viaje activo → agregar un gasto → verificar que NO aparece en Mis Gastos
2. Ir a la tab Balance → verificar que muestra el balance correcto (sin pagos previos)
3. Registrar un pago desde el botón "Registrar pago" → verificar que el balance se actualiza
4. Intentar cerrar el viaje con deudas pendientes → verificar que aparece el error con los nombres
5. Registrar todos los pagos pendientes → verificar que el botón "Sí, cerrar viaje" funciona
6. Al cerrar → ir a Mis Gastos → verificar que aparece el card con estilo boarding pass
7. El card muestra: título "Gastos: <nombre>", monto de la parte proporcional, stub con ✈️ y nombre del viaje

- [ ] **Step 2: Commit final si hay ajustes**

```bash
git add -A
git commit -m "fix: adjustments after manual testing"
```
